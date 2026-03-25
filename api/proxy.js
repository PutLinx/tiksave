export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    const videoUrl = req.query.url;
    if (!videoUrl) {
      return res.status(400).json({ error: 'URL parameter required' });
    }
    
    try {
      const response = await fetch(videoUrl);
      
      res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
      res.setHeader('Content-Length', response.headers.get('content-length'));
      res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');

      const buffer = await response.arrayBuffer();
      return res.status(200).send(Buffer.from(buffer));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    try {
      const response = await fetch('https://tikwm.com/api/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: `url=${encodeURIComponent(url)}&hd=1`
      });
      
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}