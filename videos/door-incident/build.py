import subprocess
A='assets/'
# (image, duration, caption or None)
S=[('title.png',4,None),('narrator.png',7,'c2'),('house.png',6,'c3'),('interior.png',6,'c4'),
   ('golden.png',7,'c5'),('shadows.jpg',6,'c6'),('door-shake.jpg',6,'c7'),('aftermath.png',7,'c8'),('end.png',5,None)]
X=0.6; FPS=30
cmd=['ffmpeg','-y','-v','error']
for img,d,_ in S: cmd+=['-loop','1','-t',str(d+X),'-i',A+img]
cmd+=['-i',A+'ambience.wav']
cap_idx={}
for img,d,c in S:
    if c: cap_idx[c]=len(cmd)  # placeholder
for _,_,c in S:
    if c: cmd+=['-loop','1','-t','12','-i',A+c+'.png']
n=len(S); caps=[c for _,_,c in S if c]
f=[]
ci=0
for i,(img,d,c) in enumerate(S):
    fr=int((d+X)*FPS)
    zin = i%2==0
    z = "min(zoom+0.0008,1.15)" if zin else "if(eq(on,0),1.15,max(zoom-0.0008,1.0))"
    f.append(f"[{i}:v]scale=2160:3840:flags=lanczos,zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={fr}:s=1080x1920:fps={FPS},setsar=1,format=yuva420p[b{i}]")
    if c:
        k=n+1+ci; ci+=1
        f.append(f"[{k}:v]format=yuva420p,fade=t=in:st=0.8:d=0.6:alpha=1,fade=t=out:st={d-0.2}:d=0.6:alpha=1[k{i}]")
        f.append(f"[b{i}][k{i}]overlay=0:0:shortest=1,format=yuv420p[v{i}]")
    else:
        f.append(f"[b{i}]format=yuv420p[v{i}]")
# crossfade chain
cur='v0'; off=S[0][1]
for i in range(1,n):
    out=f'x{i}'
    f.append(f"[{cur}][v{i}]xfade=transition=fade:duration={X}:offset={off-X+X - X if False else off - X + 0:.2f}[{out}]".replace(f"offset={off - X + 0:.2f}",f"offset={off - 0:.2f}") if False else f"[{cur}][v{i}]xfade=transition=fade:duration={X}:offset={off:.2f}[{out}]")
    cur=out; off+=S[i][1]
f.append(f"[{cur}]fade=t=in:st=0:d=0.8,fade=t=out:st={off+X-1.2-X:.2f}:d=1.2[vout]")
cmd+=['-filter_complex',';'.join(f),'-map','[vout]','-map',f'{n}:a','-t',str(off),
      '-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','medium','-c:a','aac','-b:a','192k','-movflags','+faststart','out/door-incident.mp4']
print(off)
subprocess.run(cmd,check=True)
