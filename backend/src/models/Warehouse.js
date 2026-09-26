import mongoose from 'mongoose';
const schema=new mongoose.Schema({name:{type:String,required:true},code:{type:String,required:true,unique:true},location:{type:String,default:''}},{timestamps:true});
export default mongoose.model('Warehouse',schema);
