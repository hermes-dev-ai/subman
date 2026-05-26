const{Router}=require('express');
const prisma=require('../prisma');
const{authenticate,requireRole}=require('../middleware/auth');
const router=Router();

router.get('/',authenticate,async(req,res)=>{
  try{
    const subs=await prisma.subscription.findMany({where:{clientId:req.user.user_id},include:{plan:true,customer:true}});
    res.json(subs);
  }catch(e){res.status(500).json({error:e.message});}
});

router.get('/:id',authenticate,async(req,res)=>{
  try{
    const s=await prisma.subscription.findFirst({where:{id:req.params.id,clientId:req.user.user_id},include:{plan:true,customer:true}});
    if(!s)return res.status(404).json({error:'Abonnement introuvable'});
    res.json(s);
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/',authenticate,requireRole('client'),async(req,res)=>{
  try{
    const{customerId,planId,startDate,endDate,trialEndDate,metadata}=req.body;
    const plan=await prisma.plan.findFirst({where:{id:planId,clientId:req.user.user_id}});
    if(!plan)return res.status(404).json({error:'Plan introuvable'});
    const s=await prisma.subscription.create({data:{clientId:req.user.user_id,customerId,planId,startDate,endDate,trialEndDate,metadata}});
    res.status(201).json(s);
  }catch(e){res.status(500).json({error:e.message});}
});

router.put('/:id',authenticate,requireRole('client'),async(req,res)=>{
  try{
    const s=await prisma.subscription.findFirst({where:{id:req.params.id,clientId:req.user.user_id}});
    if(!s)return res.status(404).json({error:'Abonnement introuvable'});
    res.json(await prisma.subscription.update({where:{id:req.params.id},data:req.body}));
  }catch(e){res.status(500).json({error:e.message});}
});

router.delete('/:id',authenticate,requireRole('client'),async(req,res)=>{
  try{
    const s=await prisma.subscription.findFirst({where:{id:req.params.id,clientId:req.user.user_id}});
    if(!s)return res.status(404).json({error:'Abonnement introuvable'});
    await prisma.subscription.delete({where:{id:req.params.id}});
    res.json({message:'Abonnement supprime'});
  }catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;