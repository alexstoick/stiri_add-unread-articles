
var request = require ('request') ;
var async = require ( 'async' ) ;

var mysql_lib = require ( 'mysql' ) ;

HOST = '37.139.8.146' ;

var mysql = mysql_lib.createPool ({
	host: HOST ,
	user : 'root',
	passsword: 'Wireless123',
	database: 'stiriAPI',
	connectionLimit: 250
}) ;

var total_users = 0 ;
var processedUsers = 0 ;

setTimeout( function () { 
	console.log ( "Taking too long - killing process" ) ;
	 process.exit() ;
	}, 60000 ) ;

get_users_query = "SELECT DISTINCT user_id AS id FROM unread_articles" ;
get_unread_articles_count = "SELECT count(*) AS count FROM unread_articles WHERE user_id = ?"
delete_unread_articles_for_user = "DELETE FROM unread_articles WHERE user_id = ?  ORDER BY id LIMIT ?" ;

mysql.getConnection ( function ( err , conn ) {

	conn.query ( get_users_query , function ( err , res ) {

		if ( err )
			console.log ( "eroare la gasit useri " + err ) ;
		else
		{
			total_users = res.length ;
			async.each ( res , processUser , function ( err ) {
				if ( err )
					console.log ( "eroare la async user " + err ) ;
			})
		}
		conn.end();
	}) ;

})

function processUser ( item , callback )
{

	// trebuie sa stiu cate rows are
	// delesc pana ajung la 500

	mysql.getConnection ( function ( err , conn ) {

		conn.query ( get_unread_articles_count , [item.id] , function ( err , res ) {
			if ( err )
				console.log ( "eroare la gasit count " + err ) ;
			else
			{
				count = res[0]["count"] ;
				if ( count > 500 )
					conn.query ( delete_unread_articles_for_user , [ item.id , count - 500 ] , function ( err , res ) {
						if ( err )
							console.log ( "eroare la delete " + err ) ;
						else
							console.log ( res ) ;
						processedUsers ++ ;
						console.log ( processedUsers + " out of " + total_users ) ;
						if ( total_users == processedUsers )
						{
							console.log ( "Killing process - work is done" ) ;
							process.exit();
						}
						conn.end();
					}) ;
				else
				{
					conn.end();
					processedUsers ++ ;
					console.log ( processedUsers + " out of " + total_users ) ;
					if ( total_users == processedUsers )
					{
						console.log ( "Killing process - work is done" ) ;
						process.exit();
					}
				}
			}
		}) ;
	}) ;

	callback(null) ;
}