
var request = require ('request') ;
var async = require ( 'async' ) ;

var Main_lib = require ( './Main.class' ) ;
var Parser_lib = require ( './Parser.class' ) ;

var redis_lib = require ( 'node-redis' ) ;
var mysql_lib = require ( 'mysql' ) ;
var Solr_lib = require ( './Solr.class' ) ;

HOST = '37.139.8.146' ;

var solr = new Solr_lib( HOST , 8983 ) ;
solr.createClient();


var redis = redis_lib.createClient ( 6379, HOST ) ;
redis.on ( 'connect' , function () { console.log ( 'Connected to Redis') ; } ) ;
redis.on ( 'error', function (err) {
	console.log('RedisError ' + err);
});

var mysql = mysql_lib.createPool ({
	host: HOST ,
	user : 'root',
	passsword: 'Wireless123',
	database: 'stiriAPI',
	connectionLimit: 100
}) ;



newssources_url = 'http://stiriromania.eu01.aws.af.cm/newssource/'
subscriber_url = "http://37.139.8.146:1234/subscribers/"




function startProcessing ()
{
	request(newssources_url , function ( error , response , body ) {

		parsed = JSON.parse (body) ;
		async.each ( parsed , processFeed , function ( err ) {
			if ( err )
				console.log ( err ) ;
		}) ;
	}) ;
}

function processFeed ( item , callback )
{
	url = item["url"] ;
	id = item["id"] ;
	subscribers = get_subscribers_for_feed ( id ) ;
	callback(null);
}


function get_subscribers_for_feed ( feed_id )
{
	url = subscriber_url + feed_id ;
	request( url , function ( error , response , body ) {
		parsed = JSON.parse( body ) ;
		subscribers = parsed["users"] ;
		return subscribers ;
	});
}

function getArticles ( feedId , url )
{

	var main = new Main_lib ( redis , mysql , solr , feedId ) ;
	main.makeRequest( url );

	main.on ( 'finished' , function () {
		console.log ( main.articles ) ;
		return main.articles ;
	} ) ;
}