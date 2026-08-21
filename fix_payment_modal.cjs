const fs = require('fs');
let code = fs.readFileSync('src/components/PremiumPaymentModal.tsx', 'utf8');

const search = `    // Call real backend API to create order with exact selected plan parameters
    try {
      const currentUserId = user?.id || user?.customer_id || user?.username || 'USER_10025';
      const orderRes = await apiClient.createOrder(currentUserId, module.id, selectedPlan.planId, {
        planName: selectedPlan.planName,
        finalPrice: selectedPlan.numericPrice,
        durationDays: selectedPlan.durationDays,
      });
      setActiveOrderId(orderRes.order.id);
      if (orderRes.upiQrImageUrl) {
        setServerQrImage(orderRes.upiQrImageUrl);
      }
    } catch (err: any) {
      console.warn('Backend order creation warning:', err);
    }

    setCheckoutStep('qr_payment');`;

const replace = `    // Call real backend API to create order with exact selected plan parameters
    try {
      const currentUserId = user?.id || user?.customer_id || user?.username || 'USER_10025';
      const orderRes = await apiClient.createOrder(currentUserId, module.id, selectedPlan.planId, {
        planName: selectedPlan.planName,
        finalPrice: selectedPlan.numericPrice,
        durationDays: selectedPlan.durationDays,
      });
      setActiveOrderId(orderRes.order.id);
      if (orderRes.upiQrImageUrl) {
        setServerQrImage(orderRes.upiQrImageUrl);
      }
      setCheckoutStep('qr_payment');
    } catch (err: any) {
      console.error('Backend order creation error:', err);
      alert(err.message || 'Failed to create order');
      return;
    }`;

code = code.replace(search, replace);
fs.writeFileSync('src/components/PremiumPaymentModal.tsx', code);
