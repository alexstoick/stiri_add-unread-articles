
var request = require ('request') ;
var async = require ( 'async' ) ;

newssources_url = 'http://stiriromania.eu01.aws.af.cm/newssource/'
subscriber_url = "http://37.139.8.146:1234/subscribers/"

request(newssources_url , function ( error , response , body ) {

	//console.log ( body ) ;
	parsed = JSON.parse (body) ;

	async.each ( parsed , processFeed , function ( err ) {
		if ( err )
			console.log ( err ) ;
	}) ;

}) ;

function processFeed ( item , callback )
{
	url = item["url"] ;
	id = item["id"] ;

	callback(null);

	subscribers = get_subscribers_for_feed ( id ) ;
}


function get_subscribers_for_feed ( feed_id )
{
	url = subscriber_url + feed_id ;
	request( url , function ( error , response , body ) {

		//console.log ( body ) ;
		parsed = JSON.parse( body ) ;

		subscribers = parsed["users"] ;

		console.log ( subscribers ) ;
		return subscribers ;
	});
}