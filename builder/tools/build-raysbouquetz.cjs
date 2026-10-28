/* Ray's storefront uses the original Nebula builder. */
const implementation=require('./build-rays-builder.cjs');
module.exports=implementation;
if(require.main===module)try{console.log(JSON.stringify(implementation.build(),null,2));}catch(error){console.error(error);process.exitCode=1;}
