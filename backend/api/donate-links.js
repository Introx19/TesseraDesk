export default function handler(req, res) {
  // CORS configuration (in addition to vercel.json)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Update these links to your actual donation pages/wallets!
  const donateLinks = {
    boosty: 'https://boosty.to/your-username',
    crypto: {
      usdt_trc20: 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      bitcoin: 'bc1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    cloudtips: 'https://pay.cloudtips.ru/p/your-id',
    message: 'Thank you for supporting the development of FlowDesk! ❤️'
  };

  res.status(200).json(donateLinks);
}
