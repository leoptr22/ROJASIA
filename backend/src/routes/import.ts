import { Router } from 'express';import multer from 'multer';import { importService } from '../services/ImportService.js';
const uploadLimit=process.env.VERCEL?4*1024*1024:25*1024*1024;
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:uploadLimit,files:1},fileFilter:(_req,file,callback)=>{const valid=/\.(xlsx|csv)$/i.test(file.originalname);if(!valid){callback(new Error('Sólo se permiten archivos .xlsx o .csv'));return}callback(null,true)}});
export const importRouter=Router();
importRouter.post('/preview',upload.single('file'),async(req,res,next)=>{try{if(!req.file){res.status(400).json({message:'Seleccioná un archivo'});return}res.json(await importService.preview(req.file.buffer,req.file.originalname,req.file.size))}catch(error){next(error)}});
importRouter.post('/confirm',async(req,res,next)=>{try{const token=String(req.body?.token??'');if(!token){res.status(400).json({message:'Token de previsualización requerido'});return}res.json(await importService.confirm(token,req.user?.username??'desconocido'))}catch(error){next(error)}});
