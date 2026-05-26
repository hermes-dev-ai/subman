const jwt = require('jsonwebtoken');
const JWT_SECRET=proces...CRET || 'submanprocess.env.JWT_SECRET-key-2026';
function authenticate(req,res,next){
  const a=req.headers.authorization;
  if(!a||!a.startsWith('Bearer ')) return res.status(401).json({error:'Token manquant'});
  try{req.user=jwt.verify(a.split(' ')[1],JWT_SECRET);next();}
  catch{res.status(401).json({error:'Token invalide'});}
}
function requireRole(...roles){
  return (req,res,next)=>{
    if(!req.user) return res.status(401).json({error:'Non authentifie'});
    const r=req.user.role==='subman_client'?'client':'customer';
    if(!roles.includes(r)) return res.status(403).json({error:'Acces refuse'});
    next();
  };
}
module.exports={authenticate,requireRole};