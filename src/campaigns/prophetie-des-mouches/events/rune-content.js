const runeAlphabet = {
  "A":"ᚨ","B":"ᛒ","C":"ᚲ","D":"ᛞ","E":"ᛖ","F":"ᚠ","G":"ᚷ","H":"ᚺ",
  "I":"ᛁ","J":"ᛃ","K":"ᚲ","L":"ᛚ","M":"ᛗ","N":"ᚾ","O":"ᛟ","P":"ᛈ",
  "Q":"ᚲ","R":"ᚱ","S":"ᛊ","T":"ᛏ","U":"ᚢ","V":"ᚢ","W":"ᚹ","X":"ᛉ",
  "Y":"ᛃ","Z":"ᛉ",
  "a":"ᚨ","b":"ᛒ","c":"ᚲ","d":"ᛞ","e":"ᛖ","f":"ᚠ","g":"ᚷ","h":"ᚺ",
  "i":"ᛁ","j":"ᛃ","k":"ᚲ","l":"ᛚ","m":"ᛗ","n":"ᚾ","o":"ᛟ","p":"ᛈ",
  "q":"ᚲ","r":"ᚱ","s":"ᛊ","t":"ᛏ","u":"ᚢ","v":"ᚢ","w":"ᚹ","x":"ᛉ",
  "y":"ᛃ","z":"ᛉ",
  "é":"ᛖ","è":"ᛖ","ê":"ᛖ","à":"ᚨ","â":"ᚨ","ô":"ᛟ","î":"ᛁ","û":"ᚢ","ç":"ᚲ",
  "É":"ᛖ","È":"ᛖ","À":"ᚨ"
}

const runeHints = [
  { id:"hint1", runes:"ᚨ=A  ᛚ=L  ᛖ=E  ᚢ=U", desc:"Fragment I"    },
  { id:"hint2", runes:"ᛁ=I  ᛖ=E  ᚱ=R  ᛊ=S", desc:"Fragment II"   },
  { id:"hint3", runes:"ᛞ=D  ᛖ=E  ᚨ=A  ᛟ=O", desc:"Fragment III"  },
  { id:"hint4", runes:"ᛒ=B  ᚱ=R  ᚨ=A  ᚢ=V", desc:"Fragment IV"   },
  { id:"hint5", runes:"ᛏ=T  ᚱ=R  ᛁ=I  ᚾ=N", desc:"Fragment V"    },
  { id:"hint6", runes:"ᛟ=O  ᛞ=D  ᛁ=I  ᚾ=N", desc:"Fragment VI"   },
  { id:"hint7", runes:"ᚹ=W  ᛊ=S  ᛟ=O  ᛗ=M", desc:"Fragment VII"  },
  { id:"hint8", runes:"ᚷ=G  ᚨ=A  ᛈ=P",       desc:"Fragment VIII" }
]

const secretMessage = "A la lueur des aurores, les braves trinquent avec Odin au sommet de l'Arbre."
const secretAnswer  = "a la lueur des aurores les braves trinquent avec odin au sommet de larbre"

/* ========================= */
/* POUVOIR                   */
/* ========================= */

