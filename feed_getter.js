
var request = require ('request') ;
var async = require ( 'async' ) ;

newssources_url = 'http://stiriromania.eu01.aws.af.cm/newssource/'

request(newssources_url , function ( error , response , body ) {

	//console.log ( body ) ;
	parsed = JSON.parse (body) ;
	console.log ( parsed ) ;
	async.each ( parsed , processFeed , function ( err ) {
		if ( err )
			console.log ( err ) ;
	}) ;

}) ;

function processFeed ( item , callback )
{
	url = item["url"] ;
	id = item["id"] ;

	console.log ( url + " " + id )

	callback(null);
}