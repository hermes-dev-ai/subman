const{Router}=require('express');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const prisma=require('../prisma');
const{authenticate}=require('../middleware/auth');
const router=Router();

const JWT_SECRET=proces...CRET||'subman***-key-2026';

function signToken(userId,email,role){
  return jwt.sign({role:role==='client'?'subman_client':'subman_customer',user_id:userId,email},JWT_SECRET,{expiresIn:'7d'});
}

// POST /auth/signup
router.post('/signup',async(req,res)=>{
  try{
    const{name,email,password,role,phone,company}=req.body;
    if(!name||!email||!password||!role)return res.status(400).json({error:'Champs requis'});
    if(!['client','customer'].includes(role))return res.status(400).json({error:'Role invalide'});
    const model=role==='client'?prisma.client:prisma.customer;
    if(await model.findUnique({where:{email}}))return res.status(409).json({error:'Email deja utilise'});
    const hash=await bcrypt.hash(password,10);
    const data=role==='client'?{name,email,passwordHash:hash,company}:{name,email,passwordHash:hash,phone};
    const user=await model.create({data,select:{id:true,name:true,email:true,phone:true,createdAt:true}});
    res.status(201).json({user,token:signToken(user.id,email,role),role});
  }catch(e){res.status(500).json({error:'Erreur inscription'});}
});

// POST /auth/login
router.post('/login',async(req,res)=>{
  try{
    const{email,password}=req.body;
    if(!email||!password)return res.status(400).json({error:'Email et mot de passe requis'});
    let user=await prisma.client.findUnique({where:{email}});
    let role='client';
    if(!user){user=await prisma.customer.findFirst({where:{email}});role='customer';}
    if(!user||!(await bcrypt.compare(password,user.passwordHash)))return res.status(401).json({error:'Email ou mot de passe incorrect'});
    const{passwordHash,...safe}=user;
    res.json({user:safe,token:signToken(user.id,email,role),role});
  }catch(e){res.status(500).json({error:'Erreur connexion'});}
});

// GET /auth/me
router.get('/me',authenticate,async(req,res)=>{
  try{
    const model=req.user.role==='subman_client'?prisma.client:prisma.customer;
    const user=await model.findUnique({where:{id:req.user.user_id},select:{id:true,name:true,email:true,phone:true,isActive:true,createdAt:true}});
    if(!user)return res.status(404).json({error:'Utilisateur introuvable'});
    res.json(user);
  }catch{res.status(401).json({error:'Token invalide'});}
});

module.exports=router;
