from pathlib import Path
from html import escape
out=Path(__file__).resolve().parents[1]/'public/assets/work'
def text(x,y,s,size=16,fill='#252526',weight=400):return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}">{escape(s)}</text>'
def rect(x,y,w,h,fill,rx=0,stroke='none'):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}"/>'
def line(x,y,w,c='#e7e8ec'):return f'<path d="M{x} {y}h{w}" stroke="{c}"/>'
def circle(x,y,r,c):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>'
def svg(name,s): (out/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="920" viewBox="0 0 1440 920"><defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="22" stdDeviation="25" flood-color="#15152e" flood-opacity=".12"/></filter></defs><g font-family="Arial,Helvetica,sans-serif">{s}</g></svg>')
def camera(x,y,scale=1):return f'<g transform="translate({x} {y}) scale({scale})">'+rect(0,15,160,100,'#30313a',15)+rect(18,0,45,25,'#282930',5)+rect(124,5,20,14,'#52545e',4)+circle(91,66,49,'#24242a')+circle(91,66,38,'#555964')+circle(91,66,30,'#171c24')+circle(91,66,20,'#314353')+circle(85,60,7,'#7a8a94')+rect(12,28,20,56,'#454650',4)+'</g>'
def drill(x,y,scale=1):return f'<g transform="translate({x} {y}) scale({scale})">'+rect(0,0,110,63,'#d4ae37',13)+rect(99,13,40,32,'#313538',6)+rect(136,23,36,9,'#8e9396',2)+rect(28,50,42,75,'#313538',10)+rect(10,112,85,30,'#d4ae37',7)+rect(9,8,30,45,'#34383a',5)+line(56,15,33,'#a58b36')+'</g>'
s=rect(0,0,1440,920,'#dedaef')+text(70,84,'lendit.',42,'#39304e',700)+text(70,118,'Less owning. More living.',16,'#5d526f')
s+='<g filter="url(#shadow)">'+rect(128,187,1125,660,'white',15)+'</g>'
s+=text(163,230,'lendit.',25,'#51408f',700)+rect(370,204,485,40,'#f6f5f8',20)+text(393,230,'What would you like to borrow?',13,'#81808a')+text(1015,230,'List an item',13)+circle(1204,222,15,'#e7e2f4')+line(128,264,1125)
s+=text(168,313,'Find something for your next something.',29,'#252331',600)+text(168,345,'Good things are closer than you think.',14,'#777581')
for i,label in enumerate(['All items','Photography','Tools & DIY','Outdoors','Music']):
 x=168+i*166;s+=rect(x,369,151,35,'#58458d' if i==0 else '#f5f4f7',18)+text(x+20,392,label,13,'white' if i==0 else '#65616e')
for i,(name,price,bg,shape) in enumerate([('Sony Alpha A7 III','$35 / day','#e8e9e4',camera),('Cordless drill kit','$12 / day','#e6e3db',drill),('Weekend camera kit','$28 / day','#e8e2de',camera)]):
 x=168+i*344;s+=rect(x,429,320,251,bg,8)+shape(x+75,493,.95)+text(x,711,name,18,'#292733',600)+text(x,739,'Chişinău · 1.2 km away',13,'#777581')+text(x,777,price,16,'#51408f',600)+circle(x+295,451,11,'white')
s+=rect(1080,338,228,430,'#fcfcfd',25,'#d6d2dd')+rect(1091,350,206,405,'white',18)+rect(1150,361,89,15,'#25232d',8)+text(1112,412,'Your next adventure.',15,'#2d2739',600)+rect(1110,430,168,158,'#ece9e4',8)+camera(1134,462,.75)+text(1110,620,'Sony Alpha A7 III',14,'#2d2739',600)+text(1110,645,'$35 / day',13,'#51408f')+rect(1110,674,168,41,'#57438e',20)+text(1155,700,'Check dates',12,'white')
svg('lendit',s)
s=rect(0,0,1440,920,'#dfece6')+text(70,84,'WholeSum',35,'#27584d',600)+text(70,118,'A little structure. A bigger picture.',16,'#557b70')
s+='<g filter="url(#shadow)">'+rect(110,186,1220,658,'#fafcfb',13)+'</g>'+rect(110,186,205,658,'#f0f5f2',13)+text(137,232,'◒ WholeSum',22,'#2c5e50',600)
for i,l in enumerate(['Workspace','Overview','Research library','Insights','Reports']):s+=rect(125,277+i*49,175,39,'#dce9e1' if i==1 else '#f0f5f2',6)+text(141,302+i*49,l,13,'#335e50')
s+=text(343,235,'Research overview',25,'#293b34',600)+text(343,265,'Make sense of what people are telling you.',14,'#74847c')+rect(1149,211,142,37,'#315f4f',6)+text(1174,235,'New research',13,'white')
for i,(value,l) in enumerate([('24','Conversations'),('128','Observations'),('12','Emerging themes')]):
 x=343+i*321;s+=rect(x,298,301,114,'white',8,'#e2e9e4')+text(x+22,329,l,13,'#77877e')+text(x+22,381,value,34,'#2a473b',600)
s+=rect(343,435,625,357,'white',8,'#e2e9e4')+text(365,468,'Themes across conversations',17,'#2a473b',600)
for i,(l,w,c) in enumerate([('Getting started',370,'#709c85'),('Finding information',290,'#a4bb9b'),('Team collaboration',340,'#bcccae'),('Everyday workflows',230,'#d3ddc1')]):
 y=512+i*63;s+=text(365,y,l,13,'#65786b')+rect(365,y+12,w,17,c,4)
s+=rect(990,435,301,357,'white',8,'#e2e9e4')+text(1012,470,'Recent insights',17,'#2a473b',600)
for i,l in enumerate(['Clarity builds confidence.','Context makes a difference.','A shared place to think.']):
 y=511+i*87;s+=text(1012,y,'RESEARCH NOTE',10,'#77877e')+text(1012,y+25,l,14,'#354e40')+line(1012,y+48,256,'#e8ede9')
svg('wholesum',s)
s=rect(0,0,1440,920,'#cbc9eb')+text(70,84,'angen ai',36,'#36304c',600)+text(70,118,'More context. Less switching.',16,'#615c7b')
s+='<g filter="url(#shadow)">'+rect(105,186,1230,660,'#202027',13)+'</g>'+rect(105,186,1230,48,'#292931',13)+circle(129,210,5,'#8a7380')+circle(148,210,5,'#948b70')+circle(167,210,5,'#6d8a7a')+text(618,215,'workspace / overview',12,'#9d9ca8')+rect(105,234,214,612,'#25252d')+text(128,274,'angen ai',23,'#e4dff4',600)
for i,l in enumerate(['Your workspace','Conversation','Files','Changes','Settings']):s+=rect(121,309+i*46,181,37,'#393440' if i==1 else '#25252d',6)+text(138,333+i*46,l,13,'#c9c5d3')
s+=text(344,278,'Build with a little more clarity.',23,'#f1edf8',600)+text(344,308,'Your context, conversation, and code. Together.',13,'#9894a6')+rect(341,340,357,95,'#2f2e37',9)+text(360,370,'YOU',10,'#aaa0c3')+text(360,398,'Help me simplify the onboarding flow.',13,'#eeebf4')+text(344,479,'ANGEN',11,'#bba9e0')+text(344,511,'Let’s bring the essentials into focus.',14,'#d8d1e5')+text(344,538,'I’ve outlined a smaller first step and',14,'#a8a1b7')+text(344,562,'kept the remaining details in context.',14,'#a8a1b7')+rect(344,600,349,63,'#292832',8,'#51475f')+text(363,625,'Proposed update',13,'#d4c4f2')+text(363,648,'Onboarding.tsx · Ready for review',11,'#a39aac')+rect(342,739,358,67,'#30303a',9)+text(360,766,'Ask a follow-up…',13,'#91899f')+rect(650,760,31,29,'#b8a1e3',5)
s+=rect(726,251,586,572,'#1b1b22',8)+text(747,281,'Onboarding.tsx',13,'#c8bfd8')+line(726,301,586,'#34323e')
code=['export function Welcome() {','  return (','    <main className="welcome">','      <StepIndicator current={1} />','      <h1>A good place to start.</h1>','      <p>Let’s set up your workspace.</p>','      <WorkspaceForm />','      <Button>Continue</Button>','    </main>','  );','}']
for i,l in enumerate(code):s+=text(745,340+i*30,str(i+1),12,'#625a74')+text(777,340+i*30,l,13,'#c0a5df' if i%3==0 else '#a4bbcd')
s+=rect(748,723,539,73,'#25232d',6)+text(766,751,'A good place to start.',19,'#e2dbea',600)+text(766,778,'Live preview · Onboarding',11,'#9b90a9')
svg('angen-ai',s)
s=rect(0,0,1440,920,'#e9dfc8')+text(70,84,'7code',40,'#282b27',700)+text(70,118,'A clear idea. A distinct character.',16,'#736e5f')
s+='<g filter="url(#shadow)">'+rect(115,200,703,595,'#f9f8f3')+rect(840,200,485,279,'#30352f')+rect(840,501,485,294,'#c1c8ab')+'</g>'
s+=text(149,240,'7code',23,'#30352f',700)+text(546,239,'About     Work     Contact',11,'#555b51')+text(151,355,'Good code.',69,'#30352f',600)+text(151,427,'Better together.',69,'#30352f',600)+text(154,492,'A digital studio for ambitious ideas.',18,'#6a7064')+rect(154,533,145,46,'#30352f',23)+text(181,562,'Meet the studio',13,'#fff')
s+=text(151,736,'Strategy / Design / Development',13,'#6a7064')+text(887,382,'7c',151,'#e9dfc8',700)+text(887,439,'An idea worth building.',14,'#c4c8bd')+text(879,562,'Built on good foundations.',16,'#394132')+text(879,692,'Aa Bb Cc',68,'#303a2b',600)
for i,c in enumerate(['#30352f','#e9dfc8','#f9f8f3','#94a179']):s+=circle(896+i*49,746,17,c)
svg('7code',s)
print('Created four original SVG project mockups.')
