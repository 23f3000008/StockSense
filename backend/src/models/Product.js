import mongoose from 'mongoose';
const productSchema=new mongoose.Schema({name:{type:String,required:true,trim:true},sku:{type:String,required:true,unique:true,trim:true,uppercase:true},category:{type:String,default:'General'},uom:{type:String,default:'pcs'},reorderLevel:{type:Number,default:0,min:0},active:{type:Boolean,default:true}},{timestamps:true});
export default mongoose.model('Product',productSchema);
