import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { parseSmartHomeCommand } from '../services/geminiService';
import { Mic, Send, X, Camera, Thermometer, Wind, Monitor, Sun, Settings2, ChevronRight, Power, PaintRoller, Upload, Image as ImageIcon, MousePointerClick, MonitorPlay, Users, LogOut, UserPlus, MicOff } from 'lucide-react';
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
  const [isListening, setIsListening] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isDecorateOpen, setIsDecorateOpen] = useState(false);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const presetVideoRef = useRef<HTMLVideoElement>(null);
  const presetCanvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState<Record<string, boolean>>({});
  const [localValues, setLocalValues] = useState<Record<string, number>>({});

  // 预设相关状态
  const [presetName, setPresetName] = useState('');
  const [capturedFaceImage, setCapturedFaceImage] = useState<string | null>(null);
  const [capturedGestureImage, setCapturedGestureImage] = useState<string | null>(null);
  const [presetStep, setPresetStep] = useState<'name' | 'face' | 'gesture'>('name');
  const [isPresetSaving, setIsPresetSaving] = useState(false);

  // 预设识别相关状态
  const webcamCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isRecognizingPreset, setIsRecognizingPreset] = useState(false);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'zh-CN';
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        addLog("正在聆听... (请说出指令)");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
        recognitionRef.current.finalTranscript = transcript;
      };
      
      recognition.onerror = (event: any) => {
          console.error("Speech Error:", event.error);
          setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Only auto-send if there's content and it wasn't just stopped manually without speech
        if (recognitionRef.current?.shouldSend && recognitionRef.current?.finalTranscript) {
             handleSend(recognitionRef.current.finalTranscript);
        }
        recognitionRef.current.shouldSend = false;
        recognitionRef.current.finalTranscript = '';
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!recognitionRef.current) {
        addLog("您的浏览器不支持语音识别");
        return;
    }

    if (isListening) {
        recognitionRef.current.stop();
        recognitionRef.current.shouldSend = false;
    } else {
        setPrompt('');
        recognitionRef.current.finalTranscript = '';
        recognitionRef.current.shouldSend = true;
        try {
            recognitionRef.current.start();
        } catch (error) {
            console.error(error);
        }
    }
  };

  const handleSend = async (manualText?: string) => {
    const textToSend = typeof manualText === 'string' ? manualText : prompt;
    
    if (!textToSend.trim()) return;
    
    setIsProcessing(true);
    addLog(`用户: ${textToSend}`);
    
    if (!manualText) setPrompt('');

    const updates = await parseSmartHomeCommand(textToSend, devices);
    
    if (updates.length > 0) {
      updateDevicesFromAI(updates);
    } else {
      addLog('AI: 未检测到设备变更需求');
    }
    
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

  // 预设保存相关函数
  const capturePresetFrame = (canvasRef: React.RefObject<HTMLCanvasElement>, videoRef: React.RefObject<HTMLVideoElement>): string | null => {
      if (videoRef.current && canvasRef.current) {
          const context = canvasRef.current.getContext('2d');
          if (context) {
              context.drawImage(videoRef.current, 0, 0, 640, 480);
              return canvasRef.current.toDataURL('image/jpeg', 0.8);
          }
      }
      return null;
  };

  const handleSavePreset = async () => {
      if (!presetName || !capturedFaceImage || !capturedGestureImage) {
          addLog('请完成所有步骤：填写名称、拍摄人脸、拍摄手势');
          return;
      }

      setIsPresetSaving(true);
      addLog('正在保存预设...');

      try {
          // 获取当前所有设备的开关状态和具体参数
          const deviceStates = devices.map(d => ({
              deviceId: d.id,
              status: d.status,
              value: d.value
          }));

          // 调用API保存预设
          const { api } = await import('../services/api');
          await api.savePreset(presetName, capturedFaceImage, capturedGestureImage, deviceStates);

          addLog('预设保存成功！');
          setIsPresetOpen(false);
          setPresetName('');
          setCapturedFaceImage(null);
          setCapturedGestureImage(null);
          setPresetStep('name');
      } catch (error: any) {
          addLog(`预设保存失败: ${error.message}`);
      } finally {
          setIsPresetSaving(false);
      }
  };

  // 识别并应用预设
  const recognizeAndApplyPreset = async () => {
      if (!videoRef.current || !webcamCanvasRef.current) return;

      setIsRecognizingPreset(true);
      addLog('正在识别预设...');

      try {
          // 拍摄当前帧
          const context = webcamCanvasRef.current.getContext('2d');
          if (context && videoRef.current) {
              context.drawImage(videoRef.current, 0, 0, 640, 480);
              const capturedImage = webcamCanvasRef.current.toDataURL('image/jpeg', 0.8);

              // 调用API识别预设（同时传递人脸和手势）
              const { api } = await import('../services/api');
              const preset = await api.recognizePreset(capturedImage, capturedImage);

              // 应用预设到设备
              if (preset.deviceStates && preset.deviceStates.length > 0) {
                  // 更新每个设备的状态
                  for (const deviceState of preset.deviceStates) {
                      const device = devices.find(d => d.id === deviceState.deviceId);
                      if (device) {
                          // 更新状态
                          if (device.status !== deviceState.status) {
                              await toggleDevice(deviceState.deviceId);
                          }
                          // 更新值
                          if (deviceState.value !== undefined && device.value !== deviceState.value) {
                              await setDeviceValue(deviceState.deviceId, deviceState.value);
                          }
                      }
                  }

                  addLog(`识别成功，已切换到 ${preset.userName} 的预设`);
              }
          }
      } catch (error: any) {
          addLog(`识别预设失败: ${error.message}`);
      } finally {
          setIsRecognizingPreset(false);
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

  // Preset Webcam Logic
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isPresetOpen && presetVideoRef.current && (presetStep === 'face' || presetStep === 'gesture')) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(s => {
                stream = s;
                if (presetVideoRef.current) {
                    presetVideoRef.current.srcObject = stream;
                    const playPromise = presetVideoRef.current.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(err => {
                            console.log("[Preset Webcam] Play interrupted or prevented:", err.message);
                        });
                    }
                }
            })
            .catch(err => {
                console.error("Camera access denied for preset:", err);
                addLog("无法访问摄像头: " + err.message);
            });
    }

    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [isPresetOpen, presetStep, addLog]);

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
                    className={`p-1.5 rounded-full transition-colors ${device.status ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                >
                    <Power size={14} />
                </button>
            </div>

            {device.type === DeviceType.AC && device.status && (
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

            {device.type === DeviceType.LIGHT && device.status && (
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
                                    : d.status 
                                        ? 'bg-cyan-900/30 border-cyan-500/30 hover:bg-cyan-900/50' 
                                        : 'bg-black/40 border-slate-700 hover:bg-slate-800/60'
                            }`}
                            onClick={() => setSelectedDeviceId(isSelected ? null : d.id)}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`font-semibold text-sm flex items-center gap-2 ${d.status ? 'text-cyan-50' : 'text-slate-400'}`}>
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
         <button 
            onClick={toggleListening}
            className={`p-2 rounded-full transition-colors relative overflow-hidden ${isListening ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}
         >
            {isListening ? (
                <div className="flex items-center gap-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20"></span>
                    <MicOff size={20} />
                </div>
            ) : (
                <Mic size={20} />
            )}
         </button>
         <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "正在聆听..." : "输入指令 (例如: 打开空调，将桌子升高)"}
            className="flex-1 bg-transparent border-none outline-none text-white px-2 placeholder-slate-500"
            disabled={isProcessing}
         />
         <button
            onClick={() => handleSend()}
            disabled={isProcessing}
            className={`p-2 rounded-full transition-colors ${isProcessing ? 'bg-slate-700' : 'bg-cyan-600 hover:bg-cyan-500'} text-white`}
         >
            {isProcessing ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Send size={18} />}
         </button>
      </div>

      {/* Bottom Right: Create Preset Button */}
      <div className="absolute bottom-6 right-6 pointer-events-auto z-50">
          <button
              onClick={() => setIsPresetOpen(!isPresetOpen)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105"
              title="创建预设"
          >
              <Users size={18} />
              <span className="text-sm font-bold">创建预设</span>
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
                {/* Recognize Preset Button */}
                <button
                    onClick={recognizeAndApplyPreset}
                    disabled={isRecognizingPreset}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white px-6 py-3 rounded-full font-bold shadow-lg z-10 flex items-center gap-2 transition-all"
                >
                    {isRecognizingPreset ? (
                        <>
                            <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                            <span>识别中...</span>
                        </>
                    ) : (
                        <>
                            <Users size={18} />
                            <span>识别并应用预设</span>
                        </>
                    )}
                </button>
                <canvas ref={webcamCanvasRef} width={640} height={480} className="hidden" />
            </div>
        </div>
      )}

      {/* Preset Modal */}
      {isPresetOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-md pointer-events-auto">
              <div className="bg-slate-800 border border-cyan-500 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                          <Users size={20} />
                          创建场景预设
                      </h2>
                      <button onClick={() => setIsPresetOpen(false)} className="text-slate-400 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>

                  {/* Steps Indicator */}
                  <div className="px-6 py-3 bg-slate-900/50 border-b border-slate-700">
                      <div className="flex items-center justify-between text-xs">
                          <div className={`flex items-center gap-2 ${presetStep === 'name' ? 'text-cyan-400' : 'text-slate-400'}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${presetStep === 'name' ? 'bg-cyan-500' : capturedFaceImage ? 'bg-green-500' : 'bg-slate-600'}`}>
                                  1
                              </div>
                              <span>填写名称</span>
                          </div>
                          <div className={`w-12 h-0.5 ${presetStep === 'face' || presetStep === 'gesture' ? 'bg-cyan-500' : 'bg-slate-600'}`}></div>
                          <div className={`flex items-center gap-2 ${presetStep === 'face' ? 'text-cyan-400' : 'text-slate-400'}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${presetStep === 'face' ? 'bg-cyan-500' : capturedGestureImage ? 'bg-green-500' : 'bg-slate-600'}`}>
                                  2
                              </div>
                              <span>拍摄人脸</span>
                          </div>
                          <div className={`w-12 h-0.5 ${presetStep === 'gesture' ? 'bg-cyan-500' : 'bg-slate-600'}`}></div>
                          <div className={`flex items-center gap-2 ${presetStep === 'gesture' ? 'text-cyan-400' : 'text-slate-400'}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${presetStep === 'gesture' ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                                  3
                              </div>
                              <span>拍摄手势</span>
                          </div>
                      </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-6 space-y-4">
                      {/* Step 1: Name Input */}
                      {presetStep === 'name' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                              <p className="text-sm text-slate-300">为您的场景预设起一个名字：</p>
                              <input
                                  type="text"
                                  value={presetName}
                                  onChange={(e) => setPresetName(e.target.value)}
                                  placeholder="例如：阅读模式、观影模式"
                                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500 transition-colors"
                              />
                              <button
                                  onClick={() => setPresetStep('face')}
                                  disabled={!presetName.trim()}
                                  className={`w-full py-3 rounded-lg font-bold transition-colors ${presetName.trim() ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                              >
                                  下一步
                              </button>
                          </div>
                      )}

                      {/* Step 2: Face Capture */}
                      {presetStep === 'face' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                              <p className="text-sm text-slate-300">请拍摄您的人脸照片：</p>
                              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                                  {!capturedFaceImage ? (
                                      <>
                                          <video ref={presetVideoRef} className="w-full h-full object-cover transform scale-x-[-1]" />
                                          <div className="absolute inset-0 border-2 border-cyan-500/30 m-8 rounded-lg pointer-events-none" />
                                      </>
                                  ) : (
                                      <img src={capturedFaceImage} alt="Face" className="w-full h-full object-cover transform scale-x-[-1]" />
                                  )}
                              </div>
                              <canvas ref={presetCanvasRef} width={640} height={480} className="hidden" />
                              <div className="flex gap-2">
                                  <button
                                      onClick={() => {
                                          const image = capturePresetFrame(presetCanvasRef, presetVideoRef);
                                          if (image) setCapturedFaceImage(image);
                                      }}
                                      disabled={isPresetSaving}
                                      className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 rounded-lg text-white font-bold transition-colors"
                                  >
                                      {capturedFaceImage ? '重拍' : '拍摄人脸'}
                                  </button>
                                  <button
                                      onClick={() => {
                                          if (capturedFaceImage) setPresetStep('gesture');
                                      }}
                                      disabled={!capturedFaceImage}
                                      className={`flex-1 py-3 rounded-lg font-bold transition-colors ${capturedFaceImage ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                                  >
                                      下一步
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* Step 3: Gesture Capture */}
                      {presetStep === 'gesture' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                              <p className="text-sm text-slate-300">请拍摄您的手势照片：</p>
                              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                                  {!capturedGestureImage ? (
                                      <>
                                          <video ref={presetVideoRef} className="w-full h-full object-cover transform scale-x-[-1]" />
                                          <div className="absolute inset-0 border-2 border-cyan-500/30 m-8 rounded-lg pointer-events-none" />
                                      </>
                                  ) : (
                                      <img src={capturedGestureImage} alt="Gesture" className="w-full h-full object-cover transform scale-x-[-1]" />
                                  )}
                              </div>
                              <canvas ref={presetCanvasRef} width={640} height={480} className="hidden" />
                              <div className="flex gap-2">
                                  <button
                                      onClick={() => {
                                          const image = capturePresetFrame(presetCanvasRef, presetVideoRef);
                                          if (image) setCapturedGestureImage(image);
                                      }}
                                      disabled={isPresetSaving}
                                      className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 rounded-lg text-white font-bold transition-colors"
                                  >
                                      {capturedGestureImage ? '重拍' : '拍摄手势'}
                                  </button>
                                  <button
                                      onClick={handleSavePreset}
                                      disabled={!capturedGestureImage || isPresetSaving}
                                      className={`flex-1 py-3 rounded-lg font-bold transition-colors ${capturedGestureImage && !isPresetSaving ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                                  >
                                      {isPresetSaving ? '保存中...' : '保存预设'}
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};