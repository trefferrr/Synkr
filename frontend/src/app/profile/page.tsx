"use client"
import { useAppData, user_service } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import React, {useState,useEffect} from 'react'
import Cookies from 'js-cookie';
import axios from 'axios';
import toast from 'react-hot-toast';
import Loading from '@/components/Loading';
import { ArrowLeft, Check, User, UserCircle, X, Edit3, Save } from 'lucide-react';

const ProfilePage = () => {
    const {user,isAuth,loading,setUser}=useAppData();
    const [isEdit,setIsEdit]=useState(false);
    const [name,setName]=useState<string | undefined>("");

    const router=useRouter();

    const editHandler=()=>{
        setIsEdit(!isEdit);
        setName(user?.name || "");
    }
    
    const submitHandler=async(e:any)=>{
        e.preventDefault();
        if(!name?.trim()){
            toast.error("Name cannot be empty");
            return;
        }
        
        if(name.trim().length < 2){
            toast.error("Name must be at least 2 characters long");
            return;
        }
        
        if(name.trim().length > 50){
            toast.error("Name must be less than 50 characters");
            return;
        }
        
        const token= Cookies.get("token");
        if(!token){
            toast.error("Please login again");
            router.push("/login");
            return;
        }
        
        try{
            const {data}=await axios.post(`${user_service}/api/v1/update/user`,{name: name.trim()},{
                headers:{
                    Authorization: `Bearer ${token}`,
                },
            });
            Cookies.set("token",data.token,{
                expires:15,
                secure:false,
                path:"/",
            });

            toast.success("Name updated successfully!");
            setUser(data.user);
            setIsEdit(false);
        }catch(e:any){
            const errorMessage = e.response?.data?.message || "Failed to update name";
            toast.error(errorMessage);
            console.error("Name update error:", e.response?.data || e.message);
        }
    }
    
    const cancelEdit = () => {
        setIsEdit(false);
        setName(user?.name || "");
    }

    useEffect(()=>{
        if(!isAuth && !loading){
            router.push("/login");
        }
    },[isAuth,router,loading]); 

    if(loading) return <Loading />

  return (
    <div className='min-h-screen bg-gradient-to-b from-gray-900 to-gray-950'>
        <div className='max-w-md mx-auto px-4 py-8'>
            {/* Header */}
            <div className='flex items-center gap-4 mb-8'>
                <button 
                    onClick={() => router.push("/chat")} 
                    className='p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors'
                >
                    <ArrowLeft className='w-5 h-5 text-gray-300'/>
                </button>
                <div>
                    <h1 className='text-2xl font-bold text-white'>Profile</h1>
                    <p className='text-gray-400 text-sm'>Manage your account</p>
                </div>
            </div>

            {/* Profile Card */}
            <div className='bg-gray-800 rounded-xl border border-gray-700 overflow-hidden'>
                {/* Profile Header */}
                <div className='bg-gray-700/50 p-6'>
                    <div className='flex items-center gap-4'>
                        <div className='relative'>
                            <div className='w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center'>
                                <UserCircle className='w-10 h-10 text-white'/>
                            </div>
                            <div className='absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-800'></div>
                        </div>
                        <div className='flex-1'>
                            <h2 className='text-xl font-bold text-white'>{user?.name || "User"}</h2>
                            <p className='text-gray-400 text-sm'>Active now</p>
                        </div>
                    </div>
                </div>

                {/* Name Section */}
                <div className='p-6'>
                    <div className='mb-4'>
                        <label className='block text-sm font-medium text-gray-300 mb-2'>Display Name</label>
                        {isEdit ? (
                            <form onSubmit={submitHandler} className='space-y-4'>
                                <div className='relative'>
                                    <input 
                                        type="text" 
                                        value={name || ''} 
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                                        placeholder="Enter your name"
                                        autoFocus
                                    />
                                    <User className='absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400'/>
                                </div>
                                <div className='flex gap-3'>
                                    <button 
                                        type='submit' 
                                        className='flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors'
                                    >
                                        <Save className='w-4 h-4'/>
                                        Save
                                    </button>
                                    <button 
                                        type='button' 
                                        onClick={cancelEdit} 
                                        className='flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors'
                                    >
                                        <X className='w-4 h-4'/>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className='flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600'>
                                <span className='text-white font-medium'>{user?.name || "Not Set"}</span>
                                <button 
                                    onClick={editHandler} 
                                    className='flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-gray-200 font-medium rounded-lg transition-colors'
                                >
                                    <Edit3 className='w-4 h-4'/>
                                    Edit
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Additional Info */}
            <div className='mt-6 text-center'>
                <p className='text-gray-500 text-sm'>
                    Your profile information is private and secure
                </p>
            </div>
        </div>
    </div>
  )
}

export default ProfilePage
