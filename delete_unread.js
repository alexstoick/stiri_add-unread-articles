
var request = require ('request') ;
var async = require ( 'async' ) ;

var mysql_lib = require ( 'mysql' ) ;

var mysql = mysql_lib.createPool ({
	host: HOST ,
	user : 'root',
	passsword: 'Wireless123',
	database: 'stiriAPI',
	connectionLimit: 250
}) ;


get_users_query = "SELECT DISTINCT user_id AS id FROM unread_articles" ;

mysql.getConnection ( function ( err , conn ) {

	conn.query ( get_users_query , function ( err , res ) {

		if ( err )
			console.log ( "eroare la gasit useri " + err ) ;
		else
		{
			console.log ( res ) ;
		}

	})

})