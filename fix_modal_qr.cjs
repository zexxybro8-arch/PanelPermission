const fs = require('fs');
let code = fs.readFileSync('src/components/PremiumPaymentModal.tsx', 'utf8');

const searchCreate = `      if (orderRes.upiQrImageUrl) {
        setServerQrImage(orderRes.upiQrImageUrl);
      }`;
const replaceCreate = `      setServerQrImage(orderRes.upiQrImageUrl || '');`;
code = code.replace(searchCreate, replaceCreate);

const searchImg = `<img
                      src={serverQrImage || DEFAULT_QR_IMAGE}
                      alt="UPI Payment QR Code"
                      referrerPolicy="no-referrer"
                      className="w-full h-auto max-h-[240px] sm:max-h-[260px] object-contain rounded-lg"
                    />`;

const replaceImg = `{serverQrImage ? (
                      <img
                        src={serverQrImage}
                        alt="UPI Payment QR Code"
                        referrerPolicy="no-referrer"
                        className="w-full h-auto max-h-[240px] sm:max-h-[260px] object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-[240px] sm:h-[260px] flex flex-col items-center justify-center bg-slate-900 border border-rose-500/50 rounded-lg text-center p-4">
                        <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
                        <span className="font-display font-bold text-lg text-rose-400">QR NOT CONFIGURED</span>
                        <span className="text-xs text-slate-500 mt-2 font-mono-code">Please contact the administrator to setup pricing QR.</span>
                      </div>
                    )}`;

code = code.replace(searchImg, replaceImg);
fs.writeFileSync('src/components/PremiumPaymentModal.tsx', code);
