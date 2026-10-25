import numpy as np, wave
sr=44100; T=54; n=sr*T; t=np.arange(n)/sr
rng=np.random.default_rng(3)
lfo=0.6+0.4*np.sin(2*np.pi*t/9)
drone=(np.sin(2*np.pi*55*t)*0.5+np.sin(2*np.pi*82.4*t)*0.3+np.sin(2*np.pi*110.3*t)*0.15)*lfo*0.22
wind=np.convolve(rng.standard_normal(n),np.ones(400)/400,'same')*3.0*(0.5+0.5*np.sin(2*np.pi*t/13+1))*0.12
a=drone+wind
def thud(at,amp=1.0,f=60):
    i=int(at*sr); L=int(0.7*sr); tt=np.arange(L)/sr
    s=np.sin(2*np.pi*(f*np.exp(-tt*6))*tt*3)*np.exp(-tt*7)*amp
    s+=np.convolve(rng.standard_normal(L),np.ones(60)/60,'same')*np.exp(-tt*18)*amp*1.5
    a[i:i+L]+=s
for at,amp in [(37.2,0.5),(38.6,0.6),(40.0,0.8),(41.6,1.4)]: thud(at,amp)
a*=np.minimum(1,np.minimum(t/2,(T-t)/3)); a=a/np.max(np.abs(a))*0.8
w=wave.open('assets/ambience.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((a*32767).astype(np.int16).tobytes()); w.close()
