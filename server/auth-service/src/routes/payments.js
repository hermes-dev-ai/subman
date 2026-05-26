const{Router}=require('express');
const prisma=require('../prisma');
const{authenticate,requireRole}=require('../middleware/auth');
const router=Router();

router.get('/',authenticate,async(req,res)=>{
  try{
    const p=await prisma.payment.findMany({where:{clientId:req.user.user_id},include:{customer:true,subscription:true}});
    res.json(p);
  }catch(e){res.status(500).json({error:e.message});}
});

router.get('/:id',authenticate,async(req,res)=>{
  try{
    const p=await prisma.payment.findFirst({where:{id:req.params.id,clientId:req.user.user_id},include:{customer:true,subscription:true}});
    if(!p)return res.status(404).json({error:'Paiement introuvable'});
    res.json(p);
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/',authenticate,requireRole('client'),async(req,res)=>{
  try{
    const{customerId,subscriptionId,amount,currency,method,reference,metadata}=req.body;
    const p=await prisma.payment.create({data:{clientId:req.user.user_id,customerId,subscriptionId,amount,currency,method,reference,metadata}});
    res.status(201).json(p);
  }catch(e){res.status(500).json({error:e.message});}
});

router.put('/:id',authenticate,requireRole('client'),async(req,res)=>{
  try{
    const p=await prisma.payment.findFirst({where:{id:req.params.id,clientId:req.user.user_id}});
    if(!p)return res.status(404).json({error:'Paiement introuvable'});
    res.json(await prisma.payment.update({where:{id:req.params.id},data:req.body}));
  }catch(e){res.status(500).json({error:e.message});}
});

router.delete('/:id',authenticate,requireRole('client'),async(req,res)=>{
  try{
    const p=await prisma.payment.findFirst({where:{id:req.params.id,clientId:req.user.user_id}});
    if(!p)return res.status(404).json({error:'Paiement introuvable'});
    await prisma.payment.delete({where:{id:req.params.id}});
    res.json({message:'Paiement supprime'});
  }catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;