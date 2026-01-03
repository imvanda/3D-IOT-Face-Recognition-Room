import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Camera, Check, UserPlus, ScanFace, X, AlertCircle } from 'lucide-react';

export const AuthOverlay = () => {
    const { 
        registerUser, 
        performFaceRecognition, 
        isAuthOverlayOpen, 
        setAuthOverlayOpen,
        addLog
    } = useStore();

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Default to scan mode. If backend returns 404, user can switch to register manually.
    const [mode, setMode] = useState<'scan' | 'register'>('scan');
    const [name, setName] = useState('');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('系统准备就绪...');
    const [isLoading, setIsLoading] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;

    // Camera Stream Setup
    useEffect(() => {
        let stream: MediaStream | null = null;
        let isMounted = true;

        if (isAuthOverlayOpen) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(s => {
                    if (!isMounted) {
                        s.getTracks().forEach(t => t.stop());
                        return;
                    }
                    stream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        const playPromise = videoRef.current.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(err => {
                                console.log("[AuthOverlay] Play interrupted or prevented:", err.message);
                            });
                        }
                    }
                })
                .catch(err => {
                    if (isMounted) setStatus("无法访问摄像头: " + err.message);
                });
        }

        return () => {
            isMounted = false;
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [isAuthOverlayOpen]);

    // Auto-scan effect (optional): Trigger scan once when overlay opens if in scan mode
    // To avoid spamming API, we do this manually via button or with a delay in a real app.
    // Here we will keep it manual or auto-scan once.
    useEffect(() => {
        if (isAuthOverlayOpen && mode === 'scan' && !isLoading && retryCount < MAX_RETRIES) {
            const timer = setTimeout(() => {
                 captureAndScan();
            }, 2000); // Increased delay to 2s
            return () => clearTimeout(timer);
        }
    }, [isAuthOverlayOpen, mode, isLoading, retryCount]);

    const captureFrame = (): string | null => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                context.drawImage(videoRef.current, 0, 0, 640, 480);
                return canvasRef.current.toDataURL('image/jpeg', 0.8);
            }
        }
        return null;
    };

    const captureAndScan = async () => {
        if (isLoading) return;
        
        const image = captureFrame();
        if (!image) return;

        setStatus(`正在连接云端识别 (${retryCount + 1}/${MAX_RETRIES})...`);
        setIsLoading(true);

        try {
            await performFaceRecognition(image);
            setStatus('识别成功！正在同步配置...');
            setTimeout(() => {
                setAuthOverlayOpen(false);
                setIsLoading(false);
                setRetryCount(0);
            }, 800);
        } catch (e: any) {
            console.error(e);
            setRetryCount(prev => prev + 1);
            if (retryCount + 1 >= MAX_RETRIES) {
                 setStatus('无法识别用户，请手动注册');
            } else {
                 setStatus('未识别到用户，正在重试...');
            }
            setIsLoading(false);
        }
    };

    const captureForRegister = () => {
        const image = captureFrame();
        if (image) setCapturedImage(image);
    };

    const handleRegister = async () => {
        if (name && capturedImage && !isLoading) {
            setIsLoading(true);
            setStatus('正在上传人脸数据...');
            try {
                await registerUser(name, capturedImage);
                // store handles closing the overlay on success
                setIsLoading(false);
            } catch (e) {
                setIsLoading(false);
                setStatus('注册失败，请重试');
            }
        }
    };

    if (!isAuthOverlayOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                        {mode === 'scan' ? <ScanFace /> : <UserPlus />}
                        {mode === 'scan' ? '云端身份识别' : '新用户注册'}
                    </h2>
                    <button onClick={() => setAuthOverlayOpen(false)} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Camera Area */}
                <div className="relative aspect-video bg-black">
                    {!capturedImage || mode === 'scan' ? (
                        <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" />
                    ) : (
                        <img src={capturedImage} alt="Captured" className="w-full h-full object-cover transform scale-x-[-1]" />
                    )}
                    <canvas ref={canvasRef} width={640} height={480} className="hidden" />
                    
                    {/* Scan Animation Overlay */}
                    {mode === 'scan' && isLoading && (
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="w-full h-1 bg-cyan-500/50 absolute top-0 animate-[scan_2s_ease-in-out_infinite]" />
                            <div className="absolute inset-0 border-2 border-cyan-500/30 m-8 rounded-lg" />
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-center gap-2 text-sm font-mono text-slate-300 min-h-[20px]">
                        {isLoading && <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />}
                        {status}
                    </div>

                    {mode === 'scan' && (
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={captureAndScan}
                                disabled={isLoading}
                                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 rounded-lg text-white font-bold transition-colors"
                            >
                                {isLoading ? '识别中...' : '手动扫描'}
                            </button>
                            <button 
                                onClick={() => { setMode('register'); setStatus('请输入姓名并拍摄照片'); setCapturedImage(null); }}
                                className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-medium transition-colors text-sm"
                            >
                                注册新用户
                            </button>
                        </div>
                    )}

                    {mode === 'register' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            {!capturedImage ? (
                                <button 
                                    onClick={captureForRegister}
                                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold flex items-center justify-center gap-2"
                                >
                                    <Camera size={18} /> 拍摄人脸
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="输入您的姓名"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-cyan-500"
                                    />
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setCapturedImage(null)}
                                            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
                                        >
                                            重拍
                                        </button>
                                        <button 
                                            onClick={handleRegister}
                                            disabled={!name.trim() || isLoading}
                                            className={`flex-1 py-2 rounded-lg text-white font-bold flex items-center justify-center gap-2 ${name.trim() ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                                        >
                                            <Check size={18} /> {isLoading ? '提交中...' : '确认注册'}
                                        </button>
                                    </div>
                                </div>
                            )}
                             <button 
                                onClick={() => { setMode('scan'); setStatus('准备扫描...'); setIsLoading(false); }}
                                className="w-full text-center text-xs text-slate-500 hover:text-slate-300 mt-2"
                            >
                                返回识别模式
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes scan {
                    0% { top: 10%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};