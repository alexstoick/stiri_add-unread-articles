
var request = require ('request')

newssources_url = 'http://stiriromania.eu01.awf.af.cm/newssource/'

request(newssources_url , function ( error , response , body ) {

	parsed = JSON.parse (body) ;

	console.log ( parsed ) ;

}) ;