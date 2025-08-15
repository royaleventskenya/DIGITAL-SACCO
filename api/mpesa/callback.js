// Safaricom will POST STK Push confirmation here. Save to payments, update loan and transactions.  
const supabase = require('../../lib/supabase');  
  
module.exports = async (req, res) => {  
  // Accept both raw JSON and nested Body  
  try {  
    const body = req.body || JSON.parse(req.body || '{}');  
  
    // Sandbox and production formats differ. Safaricom typically posts a structure where CheckoutRequestID is inside Body.stkCallback.CheckoutRequestID  
    const callback = body.Body?.stkCallback || body;  
    const checkoutRequestID = callback.CheckoutRequestID || callback.checkoutRequestID || callback.Body?.stkCallback?.CheckoutRequestID || null;  
    const resultCode = callback.ResultCode || callback.resultCode || callback.Body?.stkCallback?.ResultCode;  
    const resultDesc = callback.ResultDesc || callback.resultDesc || callback.Body?.stkCallback?.ResultDesc;  
  
    // In sandbox, the callback may include CallbackMetadata.Item array with MpesaReceiptNumber, Amount, PhoneNumber  
    let amount = null, mpesaReceiptNumber = null, phoneNumber = null;  
    const items = callback.CallbackMetadata?.Item || callback.Body?.stkCallback?.CallbackMetadata?.Item || [];  
    if (Array.isArray(items)){  
      items.forEach(i => {  
        const name = i.Name || i.name;  
        if (name && /Amount/i.test(name)) amount = Number(i.Value || i.value || i.Value);  
        if (name && /MpesaReceiptNumber/i.test(name)) mpesaReceiptNumber = i.Value;  
        if (name && /PhoneNumber/i.test(name)) phoneNumber = String(i.Value);  
      });  
    }  
  
    // Find payment record  
    if (!checkoutRequestID) {  
      console.warn('No checkoutRequestID in callback', body);  
      return res.status(400).json({ message: 'Missing checkoutRequestID' });  
    }  
  
    // update payment status  
    const status = (Number(resultCode) === 0) ? 'success' : 'failed';  
    await supabase.from('payments').update({ status, mpesa_receipt: mpesaReceiptNumber, amount_received: amount, phone: phoneNumber, result_desc: resultDesc }).eq('checkout_request_id', checkoutRequestID);  
  
    // If success, update loan outstanding and write a transaction  
    if (status === 'success'){  
      const { data: paymentRec } = await supabase.from('payments').select('*').eq('checkout_request_id', checkoutRequestID).limit(1).single();  
      if (paymentRec) {  
        const loanId = paymentRec.loan_id;  
        const amt = paymentRec.amount || amount || 0;  
  
        // reduce loan outstanding  
        const { data: loan } = await supabase.from('loans').select('*').eq('id', loanId).limit(1).single();  
        if (loan){  
          const newOutstanding = Math.max(0, Number(loan.outstanding || loan.principal) - Number(amt));  
          await supabase.from('loans').update({ outstanding: newOutstanding, status: newOutstanding === 0 ? 'paid' : loan.status }).eq('id', loanId);  
        }  
  
        // add transaction  
        await supabase.from('transactions').insert([{ user_id: paymentRec.user_id, type: 'repayment', amount: amt, created_at: new Date().toISOString() }]);  
      }  
    }  
  
    // respond 200 quickly  
    res.json({ result: 'received' });  
  } catch (e) {  
    console.error('mpesa callback error', e);  
    res.status(500).json({ message: 'Server error' });  
  }  
};
