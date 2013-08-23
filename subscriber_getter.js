
var request = require ('request') ;

subscriber_url = "http://37.139.8.146:1234/subscribers/"

function get_subscribers_for_feed ( feed_id )
{
	url = subscriber_url + feed_id ;
	request( subscriber_url , function ( error , response , body ) {

		parsed = JSON.parse( body ) ;

		subscribers = parsed["users"] ;

		console.log ( subscribers ) ;
		return subscribers ;
	});
}