const {Router}=require('express');
const prisma=require('../prisma');
const {authenticate,requireRole}=require('../middleware/auth');
const router=Router();

router.get('/',authenticate,async(req,res)=>{
  try{res.json(await prisma.plan.findMany({where:{clientId:req.user.user_id}}));}
  catch(e){res.status(500).json({error:e.message});}
});

router.get('/:id',authenticate,async(req,res)=>{
  try{
    const p=await prisma.plan.findFirst({where:{id:req.params.id,clientId:req.user.user_id}});
    if(!p)return res.status(404).json({error:'Plan introuvable'});
    res.json(p);
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/',authenticate,requireRole('client'),async(req,res)=>{
  try{
    const{name,description,price,currency,billingCycle,durationDays,trialDays}=req.body;
    const p=await prisma.plan.create({data:{...req.body,clientId:req.user.user_id}});
    res.status(201).json(p);
  }catch(e){res.status(500).json({error:e.message});}
});

router.put('/:id',authenticate,requireRole('client'),async(req,res)=>{
  try{
    const p=await prisma.plan.findFirst({where:{id:req.params.id,clientId:req.user.user_id}});
    if(!p)return res.status(404).json({error:'Plan introuvable'});
    res.json(await prisma.plan.update({where:{id:req.params.id},data:req.body}));
  }catch(e){res.status(500).json({error:e.message});}
});

router.delete('/:id',authenticate,requireRole('client'),async(req,res)=>{
  try{
    const p=await prisma.plan.findFirst({where:{id:req.params.id,clientId:req.user.user_id}});
    if(!p)return res.status(404).json({error:'Plan introuvable'});
    await prisma.plan.delete({where:{id:req.params.id}});
    res.json({message:'Plan supprime'});
  }catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;