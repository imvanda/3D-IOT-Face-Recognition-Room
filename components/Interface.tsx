import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { parseSmartHomeCommand } from '../services/geminiService';
import { Mic, Send, X, Camera, Thermometer, Wind, Monitor, Sun, Settings2, ChevronRight, Power, PaintRoller, Upload, Image as ImageIcon, MousePointerClick, MonitorPlay, Users, LogOut, UserPlus } from 'lucide-react';
import { DeviceType, IotDevice } from '../types';
import { AuthOverlay } from './AuthOverlay';

export const Interface = () => {
  const { 
    devices, 
    toggleDevice, 
    setDeviceValue,
    updateDevicesFromAI, 
    logs, 
    addLog,
    lookAtProgress,
    isWebcamOpen,
    closeWebcam,
    setTexture,
    isLocked,
    activeUsers,
    logoutUser,
    setAuthOverlayOpen
  } = useStore();
  
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isDecorateOpen, setIsDecorateOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState<Record<string, boolean>>({});
  const [localValues, setLocalValues] = useState<Record<string, number>>({});

  const handleSend = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    addLog(`用户: ${prompt}`);
    
    const updates = await parseSmartHomeCommand(prompt, devices);
    
    if (updates.length > 0) {
      updateDevicesFromAI(updates);
    } else {
      addLog('AI: 未检测到设备变更需求');
    }
    
    setPrompt('');
    setIsProcessing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, key: 'floor' | 'wall' | 'desk' | 'windowView' | 'projector') => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setTexture(key, url);
          addLog(`已更新${key === 'floor' ? '地板' : key === 'wall' ? '墙面' : key === 'desk' ? '桌面' : key === 'windowView' ? '窗外' : '投影'}材质`);
      }
  };

  // Webcam Logic
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isWebcamOpen && videoRef.current) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(s => {
                stream = s;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            })
            .catch(err => {
                console.error("Camera access denied:", err);
                addLog("无法访问摄像头: " + err.message);
                closeWebcam();
            });
    }

    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [isWebcamOpen, closeWebcam, addLog]);

  const getIcon = (type: DeviceType) => {
    switch(type) {
        case DeviceType.LIGHT: return <Sun size={16} />;
        case DeviceType.AC: return <Wind size={16} />;
        case DeviceType.SENSOR: return <Thermometer size={16} />;
        case DeviceType.CAMERA: return <Camera size={16} />;
        default: return <Monitor size={16} />;
    }
  };

  const renderControlPanel = (device: IotDevice) => {
    return (
        <div 
            className="mt-2 pt-2 border-t border-slate-600 space-y-3 animate-in fade-in slide-in-from-top-2"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">电源开关</span>
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleDevice(device.id); }}
                    className={`p-1.5 rounded-full transition-colors ${device.isOn ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                >
                    <Power size={14} />
                </button>
            </div>

            {device.type === DeviceType.AC && device.isOn && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                        <span>温度设定</span>
                        <span>{(localValues[device.id] ?? device.value) as number}°C</span>
                    </div>
                    <input 
                        type="range" min="16" max="30" step="1"
                        value={(localValues[device.id] ?? device.value) as number}
                        onInput={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            setLocalValues(prev => ({ ...prev, [device.id]: value }));
                        }}
                        onChange={(e) => {
                             // React 的 onChange 在滑条上行为等同于 onInput，这里仅用于兼容性，实际逻辑在 onMouseUp/onTouchEnd
                             const value = parseInt((e.target as HTMLInputElement).value);
                             setLocalValues(prev => ({ ...prev, [device.id]: value }));
                        }}
                        onMouseUp={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            setLocalValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[device.id];
                                return newValues;
                            });
                            setDeviceValue(device.id, value);
                        }}
                        onTouchEnd={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            setLocalValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[device.id];
                                return newValues;
                            });
                            setDeviceValue(device.id, value);
                        }}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                </div>
            )}

            {device.type === DeviceType.LIGHT && device.isOn && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                        <span>亮度</span>
                        <span>{(localValues[device.id] ?? device.value) as number}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="100" step="5"
                        value={(localValues[device.id] ?? device.value) as number}
                        onInput={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            setLocalValues(prev => ({ ...prev, [device.id]: value }));
                        }}
                        onChange={(e) => {
                             const value = parseInt((e.target as HTMLInputElement).value);
                             setLocalValues(prev => ({ ...prev, [device.id]: value }));
                        }}
                        onMouseUp={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            setLocalValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[device.id];
                                return newValues;
                            });
                            setDeviceValue(device.id, value);
                        }}
                        onTouchEnd={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            setLocalValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[device.id];
                                return newValues;
                            });
                            setDeviceValue(device.id, value);
                        }}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                    />
                </div>
            )}

            {device.type === DeviceType.CURTAIN && (
                 <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                        <span>开合程度</span>
                        <span>{(localValues[device.id] ?? device.value) as number}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="100" step="5"
                        value={(localValues[device.id] ?? device.value) as number}
                        onInput={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            setLocalValues(prev => ({ ...prev, [device.id]: value }));
                        }}
                        onChange={(e) => {
                             const value = parseInt((e.target as HTMLInputElement).value);
                             setLocalValues(prev => ({ ...prev, [device.id]: value }));
                        }}
                        onMouseUp={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            setLocalValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[device.id];
                                return newValues;
                            });
                            setDeviceValue(device.id, value);
                        }}
                        onTouchEnd={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            setLocalValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[device.id];
                                return newValues;
                            });
                            setDeviceValue(device.id, value);
                        }}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                </div>
            )}
            
            {device.type === DeviceType.DESK && (
                 <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                        <span>高度 (cm)</span>
                        <span>{localValues[device.id] ?? device.value}</span>
                    </div>
                    <input 
                        type="range" min="70" max="120" step="1"
                        value={(localValues[device.id] ?? device.value) as number}
                        onInput={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            setLocalValues(prev => ({ ...prev, [device.id]: value }));
                        }}
                        onChange={(e) => {
                             const value = parseInt((e.target as HTMLInputElement).value);
                             setLocalValues(prev => ({ ...prev, [device.id]: value }));
                        }}
                        onMouseUp={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            setLocalValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[device.id];
                                return newValues;
                            });
                            setDeviceValue(device.id, value);
                        }}
                        onTouchEnd={(e) => {
                            const value = parseInt((e.target as HTMLInputElement).value);
                            setLocalValues(prev => {
                                const newValues = { ...prev };
                                delete newValues[device.id];
                                return newValues;
                            });
                            setDeviceValue(device.id, value);
                        }}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-orange-400"
                    />
                </div>
            )}
        </div>
    );
  };

  return (
    <div 
        className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6" 
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
    >
      
      {/* Identity System Overlay */}
      <div className="pointer-events-auto" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
         <AuthOverlay />
      </div>

      {/* Click to Resume Overlay */}
      {!isLocked && !isWebcamOpen && !isDecorateOpen && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
              <div className="bg-slate-900/60 px-4 py-2 rounded-full border border-cyan-500/30 flex items-center gap-2 animate-pulse">
                  <MousePointerClick className="text-cyan-400" size={16} />
                  <p className="text-cyan-100 font-mono text-xs">点击画面继续漫游</p>
              </div>
          </div>
      )}

      {/* Top Left: Status & Logs */}
      <div 
        className="pointer-events-auto bg-black/60 text-white p-4 rounded-lg backdrop-blur-sm max-w-sm border border-slate-700 shadow-lg z-50"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="text-xl font-bold mb-2 flex items-center gap-2 text-cyan-400">
           <Monitor /> 智能家居控制中心
        </h1>
        <p className="text-xs text-slate-400 mb-4">WASD移动, 鼠标转向, ESC退出控制</p>
        
        <div className="h-32 overflow-y-auto font-mono text-xs space-y-1 mb-2 scrollbar-thin scrollbar-thumb-slate-600">
           {logs.map((log, i) => (
             <div key={i} className="border-l-2 border-cyan-500 pl-2 opacity-80">{log}</div>
           ))}
        </div>
      </div>

      {/* Top Center: User Identity Widget */}
      <div 
        className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-start gap-2"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
         {activeUsers.map(user => (
             <div key={user.id} className="bg-slate-900/80 backdrop-blur-md rounded-full border border-cyan-500/50 pr-4 flex items-center gap-3 p-1 animate-in fade-in slide-in-from-top-4 shadow-lg group">
                 <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400" />
                 <div className="flex flex-col">
                     <span className="text-xs text-cyan-400 font-bold">已识别</span>
                     <span className="text-sm text-white font-medium leading-none">{user.name}</span>
                 </div>
                 <button 
                    onClick={() => logoutUser(user.id)} 
                    className="ml-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="登出"
                 >
                     <LogOut size={16} />
                 </button>
             </div>
         ))}
         
         {/* Add User Button */}
         <button 
            onClick={() => setAuthOverlayOpen(true)}
            className="bg-slate-900/80 p-2.5 rounded-full border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
            title="添加用户"
         >
             <UserPlus size={20} />
         </button>
      </div>

      {/* Crosshair Progress */}
      {lookAtProgress > 0 && !isWebcamOpen && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none mt-12 z-40">
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden border border-white/20">
                <div 
                    className="h-full bg-cyan-500 transition-all duration-75 ease-linear"
                    style={{ width: `${lookAtProgress}%` }}
                />
            </div>
            <p className="text-center text-cyan-400 text-xs mt-1 font-mono tracking-widest">
                ACCESSING CAMERA...
            </p>
         </div>
      )}

      {/* Top Right: Buttons */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-2 pointer-events-auto z-50">
          {/* Decorate Button */}
          <button 
            onClick={() => setIsDecorateOpen(!isDecorateOpen)}
            className="bg-slate-800 p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-600 shadow-md"
            title="装修模式"
          >
              <PaintRoller size={20} />
          </button>

          {/* Device List (Scrollable) */}
          {!isDecorateOpen && (
              <div 
                className="w-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[calc(100vh-200px)]"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {devices.filter(d => d.type !== DeviceType.CAMERA).map(d => {
                    const isSelected = selectedDeviceId === d.id;
                    return (
                        <div 
                            key={d.id} 
                            className={`p-3 rounded-lg border backdrop-blur-md cursor-pointer transition-all shadow-md ${
                                isSelected 
                                    ? 'bg-slate-800/90 border-cyan-500 ring-1 ring-cyan-500/50' 
                                    : d.isOn 
                                        ? 'bg-cyan-900/30 border-cyan-500/30 hover:bg-cyan-900/50' 
                                        : 'bg-black/40 border-slate-700 hover:bg-slate-800/60'
                            }`}
                            onClick={() => setSelectedDeviceId(isSelected ? null : d.id)}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`font-semibold text-sm flex items-center gap-2 ${d.isOn ? 'text-cyan-50' : 'text-slate-400'}`}>
                                    {getIcon(d.type)} {d.name}
                                </span>
                                <div className="flex items-center gap-2">
                                    {d.value && !isSelected && <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-slate-300">{d.value}</span>}
                                    {isSelected ? <Settings2 size={14} className="text-cyan-400"/> : <ChevronRight size={14} className="text-slate-500"/>}
                                </div>
                            </div>
                            
                            {/* Expanded Controls */}
                            {isSelected && renderControlPanel(d)}
                        </div>
                    );
                })}
              </div>
          )}

          {/* Decorate Panel */}
          {isDecorateOpen && (
              <div 
                className="w-72 bg-slate-900/90 backdrop-blur-md border border-slate-600 rounded-lg p-4 shadow-xl text-white"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                      <h3 className="font-bold flex items-center gap-2"><PaintRoller size={16}/> 装修模式</h3>
                      <button onClick={() => setIsDecorateOpen(false)} className="hover:text-red-400"><X size={16}/></button>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">上传图片以自定义房间材质。</p>
                  
                  <div className="space-y-4">
                      {/* Floor */}
                      <div className="space-y-1">
                          <label className="text-xs font-semibold text-cyan-400">地板贴图</label>
                          <label className="flex items-center justify-center w-full h-10 border border-dashed border-slate-500 rounded cursor-pointer hover:bg-slate-800 transition-colors">
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'floor')} />
                              <span className="text-xs flex items-center gap-2 text-slate-400"><Upload size={12} /> 选择图片</span>
                          </label>
                      </div>

                       {/* Wall */}
                       <div className="space-y-1">
                          <label className="text-xs font-semibold text-cyan-400">墙面贴图</label>
                          <label className="flex items-center justify-center w-full h-10 border border-dashed border-slate-500 rounded cursor-pointer hover:bg-slate-800 transition-colors">
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'wall')} />
                              <span className="text-xs flex items-center gap-2 text-slate-400"><Upload size={12} /> 选择图片</span>
                          </label>
                      </div>

                       {/* Desk */}
                       <div className="space-y-1">
                          <label className="text-xs font-semibold text-cyan-400">桌面贴图</label>
                          <label className="flex items-center justify-center w-full h-10 border border-dashed border-slate-500 rounded cursor-pointer hover:bg-slate-800 transition-colors">
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'desk')} />
                              <span className="text-xs flex items-center gap-2 text-slate-400"><Upload size={12} /> 选择图片</span>
                          </label>
                      </div>
                      
                      {/* Window View */}
                       <div className="space-y-1">
                          <label className="text-xs font-semibold text-cyan-400">窗外景色</label>
                          <label className="flex items-center justify-center w-full h-10 border border-dashed border-slate-500 rounded cursor-pointer hover:bg-slate-800 transition-colors">
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'windowView')} />
                              <span className="text-xs flex items-center gap-2 text-slate-400"><ImageIcon size={12} /> 选择图片</span>
                          </label>
                      </div>

                      {/* Projector View */}
                      <div className="space-y-1">
                          <label className="text-xs font-semibold text-cyan-400">投影画面</label>
                          <label className="flex items-center justify-center w-full h-10 border border-dashed border-slate-500 rounded cursor-pointer hover:bg-slate-800 transition-colors">
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'projector')} />
                              <span className="text-xs flex items-center gap-2 text-slate-400"><MonitorPlay size={12} /> 选择图片</span>
                          </label>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* Bottom: Chat Input */}
      <div className="pointer-events-auto w-full max-w-2xl mx-auto bg-black/80 backdrop-blur-md rounded-full border border-slate-700 p-2 flex items-center gap-2 shadow-2xl z-50">
         <div className="p-2 rounded-full bg-slate-800 text-slate-400">
            <Mic size={20} />
         </div>
         <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入指令 (例如: 打开空调，将桌子升高)"
            className="flex-1 bg-transparent border-none outline-none text-white px-2 placeholder-slate-500"
            disabled={isProcessing}
         />
         <button 
            onClick={handleSend}
            disabled={isProcessing}
            className={`p-2 rounded-full transition-colors ${isProcessing ? 'bg-slate-700' : 'bg-cyan-600 hover:bg-cyan-500'} text-white`}
         >
            {isProcessing ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Send size={18} />}
         </button>
      </div>

      {/* Webcam Modal */}
      {isWebcamOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 pointer-events-auto">
            <div className="relative bg-slate-900 border border-cyan-500 p-1 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.3)] max-w-4xl w-full aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover rounded" />
                <button 
                    onClick={closeWebcam}
                    className="absolute top-4 right-4 bg-red-600 hover:bg-red-500 text-white p-2 rounded-full z-10"
                >
                    <X size={24} />
                </button>
                <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded text-cyan-400 font-mono text-sm border border-cyan-500/30 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    LIVE FEED: SECURITY CAM
                </div>
                {/* HUD Overlay Lines */}
                <div className="absolute inset-0 pointer-events-none opacity-30">
                    <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-cyan-400" />
                    <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-cyan-400" />
                    <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-cyan-400" />
                    <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-cyan-400" />
                    <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-8 h-8 border border-white/20 rounded-full flex items-center justify-center">
                             <div className="w-1 h-1 bg-red-500 rounded-full" />
                         </div>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};