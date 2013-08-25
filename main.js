
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
	connectionLimit: 250
}) ;

mysql_insert_query = "INSERT INTO unread_articles SET ?"

newssources_url = 'http://stiriromania.eu01.aws.af.cm/newssource/'
subscriber_url = "http://37.139.8.146:1234/subscribers/"

console.log ( new Date() ) ;

startProcessing();

setTimeout( function () { 
	console.log ( "Taking too long - killing process" ) ;
	 process.exit() ;
	}, 60000 ) ;

var total_of_inserts_required = 0 ;
var inserts_completed = 0 ;

var total_feeds = 0 ;
var feeds_processed = 0 ;

function startProcessing ()
{
	request(newssources_url , function ( error , response , body ) {

		if ( error )
		{
			console.log ( "eroare la primit newssources" + error ) ;
		}
		else
		{
			parsed = JSON.parse (body) ;
			total_feeds = parsed.length ;
			async.each ( parsed , processFeed , function ( err ) {
				if ( err )
					console.log ( " eroare la procesare " + err ) ;
			}) ;
		}
	}) ;
}



function processFeed ( item , callback )
{
	feed_url = item["url"] ;
	feed_id = item["id"] ;

	async.parallel ( [
		function ( p_callback ) {
				url = subscriber_url + feed_id ;
				request( url , function ( error , response , body ) {
					parsed = JSON.parse( body ) ;
					subscribers = parsed["users"] ;
					p_callback ( null , subscribers ) ;
				});
		},
		function ( p_callback ) {

			var main = new Main_lib ( redis , mysql , solr , feed_id ) ;
			main.makeRequest( feed_url );
			main.on ( 'finished' , function () {
				p_callback ( null , main.articles ) ;
			} ) ;

		}
	],
	function ( err , results ) {
		subscribers = results[0] ;
		articles = results[1] ;
		total_of_inserts_required += subscribers.length * articles.length ;
		feeds_processed ++ ;
		console.log ( "Feeds: " + feeds_processed + " out of " + total_feeds + " " ) ;
		if ( feeds_processed == total_feeds && total_of_inserts_required == 0 )
		{
			console.log ( 'Killing the process - work is done here' ) ;
			process.exit( );
		}
		addToUnreadArticles ( subscribers , articles ) ;
	}) ;


	callback(null);
}


function addToUnreadArticles ( subscribers , articles )
{

	async.each ( articles , function ( item_article , callback ) {

			async.each ( subscribers , function ( item_user , p_callback ) {
					mysql_set = { article_id : item_article.id , user_id : item_user } ;
					insert_into_mysql ( mysql_set ) ;
				},
				function ( err ) {
					if ( err )
						console.log ( "eroare la async - adaugat in baza de date subscriberi " + err ) ;
				}
			) ;

		} ,
		function ( err ) {
			if ( err )
				console.log ( "eroare la async - adaugat in baza de date articole " +  err) ;
		}
	);

}


function insert_into_mysql ( mysql_set )
{
	mysql.getConnection ( function ( err , conn ) {
		conn.query ( mysql_insert_query , mysql_set , function ( err , res) {
			inserts_completed ++ ;
			console.log ( inserts_completed + " out of " + total_of_inserts_required ) ;

			if ( inserts_completed == total_of_inserts_required && feeds_processed == total_feeds )
			{
				console.log ( 'Killing the process - work is done here' ) ;
				process.exit( );
			}
			conn.end();
		});
	});
}