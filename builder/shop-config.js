/* SHOP OWNER: all amounts below are SAMPLE integer cents (400 = 4.00).
   Review every amount, including zero-priced extras, before setting demo:false.
   This file includes seasonal flowers and every priced extra. Currency changes
   never convert prices. See SHOP-SETUP.md; run node tools/check-shop.cjs to check it.
   No passwords or API keys belong in this public file. */
window.NEBULA_SHOP={name:'Nebula',
  studio:{name:'Nebula Sites Studio',site:'nebulastudio.site/flowers',
          phone:'(571) 336-7129',instagram:'@nebulaa_studio',
          place:'Virginia, USA — serving businesses across the US',year:'2026'},
  currency:'USD',demo:true,whatsapp:'15713367129',email:'',
  baseCents:2500, // Preparation / wrapping, once per non-empty bouquet.
  laborCents:{classic:1000,dome:1000,heart:1500},
  extrasCents:{
    butterfly:300, crown:1500, ribbon:0, sash:0,
    filler:200, // Per baby's-breath cluster, separate from a Classic sprig.
    snoopy:2200, kitty:2200, snoopy_topper:600,
    floralInitial:1200, pumpkin:1800, bow:400,
    spookyMask:2000, spookyBow:400, ghostCount:100, thistleCount:250
  },
  flowerPrices:{
  "rose_red": 400,
  "rose_pink": 400,
  "rose_white": 400,
  "rose_violet": 400,
  "rose_yellow": 400,
  "rose_orange": 400,
  "tulip_red": 300,
  "tulip_pink": 300,
  "tulip_white": 300,
  "tulip_violet": 300,
  "tulip_yellow": 300,
  "tulip_orange": 300,
  "carnation_red": 250,
  "carnation_pink": 250,
  "carnation_white": 250,
  "carnation_violet": 250,
  "carnation_yellow": 250,
  "carnation_orange": 250,
  "lily": 500,
  "gerbera_daisy": 400,
  "sunflower": 400,
  "ranunculus": 500,
  "alstroemeria": 300,
  "eucalyptus": 200,
  "statice_purple": 200,
  "babys_breath": 200,
  "hydrangea": 650,
  "chrysanthemum_yellow": 400,
  "spray_rose": 450,
  "stock_yellow": 350,
  "rose_cream": 400,
  "__berry": 300,
  "rosemary": 200,
  "__choc": 500,
  // Seasonal catalogue. Greenery uses eucalyptus above, per sprig.
  "rose_ivory": 400,
  "rose_caramel": 400,
  "mum_rust": 350,
  "mum_burgundy": 350,
  "rose_black": 400,
  "pink_daisy": 400
}};
