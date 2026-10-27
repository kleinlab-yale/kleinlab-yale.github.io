export const BOTS = [
  { id: 'milo', name: 'Milo', title: 'The easygoing one', elo: 400, tag: 'Beginner', color: '#ead6bd', shirt: '#9b624a', skin: '#edb78f', hair: '#63462f', style: 0, quote: 'A little curiosity goes a long way. Your move!', description: 'A friendly face for your first moves. He gets a little distracted by his coffee.', depth: 1, noise: 220, blunder: .45 },
  { id: 'june', name: 'June', title: 'The wild card', elo: 700, tag: 'Casual', color: '#d8e2ce', shirt: '#557865', skin: '#b97953', hair: '#302b2a', style: 1, quote: 'Let’s make something interesting happen.', description: 'Creative, curious, and always ready to try something unexpected.', depth: 1, noise: 100, blunder: .24 },
  { id: 'theo', name: 'Theo', title: 'The quiet strategist', elo: 1000, tag: 'Intermediate', color: '#d5dceb', shirt: '#627696', skin: '#e3b192', hair: '#3e3330', style: 2, quote: 'Every move tells a story. What’s yours?', description: 'Patient plans, clever forks, and a very well organized bookshelf.', depth: 2, noise: 50, blunder: .12 },
  { id: 'cleo', name: 'Cleo', title: 'The calculated risk', elo: 1300, tag: 'Challenging', color: '#e6d7e7', shirt: '#877097', skin: '#975e43', hair: '#29252d', style: 3, quote: 'I have a plan. You might want one, too.', description: 'An eye for detail and a taste for a beautifully executed combination.', depth: 2, noise: 20, blunder: .04 },
  { id: 'hugo', name: 'Hugo', title: 'The fearless attacker', elo: 1600, tag: 'Advanced', color: '#eed6cc', shirt: '#a46253', skin: '#d7a27d', hair: '#6d4935', style: 4, quote: 'The best defense? You can probably guess.', description: 'Bold attacks, active pieces, and absolutely no interest in playing it safe.', depth: 3, noise: 12, blunder: .02 },
  { id: 'sora', name: 'Sora', title: 'The endgame artist', elo: 1900, tag: 'Expert', color: '#d9d7e8', shirt: '#655c89', skin: '#e7bca1', hair: '#262b33', style: 5, quote: 'Let’s see what you’ve been practicing.', description: 'Precise and composed. Every small advantage is the start of something.', depth: 3, noise: 0, blunder: 0 },
];
export const OUTFITS = [
 {id:'classic',name:'The original',description:'Good taste is timeless.',cost:0,icon:'✦',color:'#e6dfed'},
 {id:'scholar',name:'The scholar',description:'A little wisdom looks good on you.',cost:120,icon:'🎓',color:'#dce6dc'},
 {id:'royal',name:'Royal treatment',description:'Play like you own the board.',cost:350,icon:'👑',color:'#f4e6c7'},
 {id:'wizard',name:'Midnight magic',description:'Something wickedly clever.',cost:180,icon:'🧙',color:'#e7dcf1',season:'autumn'},
 {id:'pumpkin',name:'Pumpkin spice',description:'Your most spirited look yet.',cost:100,icon:'🎃',color:'#f2dfcc',season:'autumn'},
 {id:'winter',name:'Winter wonder',description:'Stay cool under pressure.',cost:180,icon:'❄️',color:'#dce8f1',season:'winter'},
 {id:'bloom',name:'Fresh beginnings',description:'Let your game blossom.',cost:180,icon:'🌸',color:'#f0dce6',season:'spring'},
 {id:'sunshine',name:'Golden hour',description:'Bring a little sunshine.',cost:180,icon:'☀️',color:'#f3e8bd',season:'summer'},
];
export function seasonAt(date = new Date()) { const m=date.getMonth(); return m>=8&&m<=10?'autumn':m===11||m<=1?'winter':m<=4?'spring':'summer'; }
export const SEASONS = {autumn:{name:'The midnight collection',eyebrow:'A LITTLE MAGIC. A LIMITED TIME.',description:'Spooky season. Seriously good style. Play your way to exclusive autumn looks.',icon:'🎃'},winter:{name:'A winter kind of magic',eyebrow:'COOL MOVES. WARM REWARDS.',description:'Make the season your own with limited-edition winter wardrobe rewards.',icon:'❄️'},spring:{name:'Your game, in full bloom',eyebrow:'A FRESH SEASON OF PLAY.',description:'Fresh moves deserve a fresh look. Unlock our limited spring collection.',icon:'🌸'},summer:{name:'Make your golden move',eyebrow:'LONG DAYS. GREAT GAMES.',description:'Bring a little sunshine to the board with our limited summer collection.',icon:'☀️'}};
