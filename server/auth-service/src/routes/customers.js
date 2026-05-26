const{Router}=require('express');
const prisma=require('../prisma');
const{authenticate,requireRole}=require('../middleware/auth');
const router=Router();

router.get('/',authenticate,async(req,res)=>{
  try{res.json(await prisma.customer.findMany({where:{clientId:req.user.user_id}}));}
  catch(e){res.status(500).json({error:e.message});}
});

router.get('/:id',authenticate,async(req,res)=>{
  try{
    const c=await prisma.customer.findFirst({where:{id:req.params.id,clientId:req.user.user_id}});
    if(!c)return res.status(404).json({error:'Client introuvable'});
    res.json(c);
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/',authenticate,requireRole('client'),async(req,res)=>{
  try{
    const{name,email,phone,metadata}=req.body;
    const existing=await prisma.customer.findUnique({where:{clientId_email:{clientId:req.user.user_id,email}}});
    if(existing)return res.status(409).json({error:'Email deja existant'});
    const c=await prisma.customer.create({data:{name,email,phone,metadata,clientId:req.user.user_id}});
    res.status(201).json(c);
  }catch(e){res.status(500).json({error:e.message});}
});

router.put('/:id',authenticate,requireRole('client'),async(req,res)=>{
  try{
    const c=await prisma.customer.findFirst({where:{id:req.params.id,clientId:req.user.user_id}});
    if(!c)return res.status(404).json({error:'Client introuvable'});
    res.json(await prisma.customer.update({where:{id:req.params.id},data:req.body}));
  }catch(e){res.status(500).json({error:e.message});}
});

router.delete('/:id',authenticate,requireRole('client'),async(req,res)=>{
  try{
    const c=await prisma.customer.findFirst({where:{id:req.params.id,clientId:req.user.user_id}});
    if(!c)return res.status(404).json({error:'Client introuvable'});
    await prisma.customer.delete({where:{id:req.params.id}});
    res.json({message:'Client supprime'});
  }catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;