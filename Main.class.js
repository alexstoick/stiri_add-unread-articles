
module.exports = Main  ;

var Parser_lib = require ( './Parser.class' ) ;
var request = require ( 'request') ;
var events = require ( 'events' ) ;

Main.super_ = events.EventEmitter;
Main.prototype = Object.create(events.EventEmitter.prototype, {
	constructor: {
		value: Main,
		enumerable: false
	}
});


function Main ( redis , mysql , solr , currentDate , feedId )
{

	events.EventEmitter.call(this);

	this.date = new Date();
	this.mysql_query = 'INSERT INTO articles SET ?' ;
	this.parserURL = 'http://37.139.8.146:8080/?url=' ;


	this.feedId = feedId ;
	this.redis = redis ;
	this.solr = solr ;
	this.mysql = mysql ;

	this.parser = new Parser_lib ( this ) ;
	this.articles_proccessed = 0 ;
	this.count = 500 ;

	var self = this ;
	this.parser.on ( 'endParse' , function ( count ) { self.count = count ; } ) ;
	this.parser.on ( 'newArticle' , this.newArticle ) ;

	console.log ( currentDate ) ;
	this.currentDate = currentDate ;
	this.articles = [] ;

}

Main.prototype.makeRequest = function ( url )
{
	this.parser.request ( url ) ;
}

Main.prototype.newArticle = function ( url , title , description , pubDate ) {

	var self = this.current_instance ;

	self.redis.exists ( url , function ( err , res) {

		if ( res == 0 )
		{
			//Setup key in redis
			self.redis.set ( url , 'updated' ) ;

			//get parserizer
			request.get ( self.parserURL + url , function ( err , response, body ) {
				if ( err )
					console.log ( 'request error' + err ) ;
				self.addToSolrAndMySQL ( url , title , description , body , pubDate , self ) ;
			}) ;
		}
	} ) ;
}

Main.prototype.addToSolrAndMySQL = function ( url , title , description , response , pubDate , instance )
{
	var self = instance ;
	parsed = JSON.parse ( response ) ;
	text = parsed ["response"] ;

	mysql_set =  { url: url , title: title , text: text , description: description , created_at: pubDate , feed: self.feedId } ;
	solr_set  =  { url: url , title: title , content: text , description: description , last_modified: self.date}

	self.solr.add ( solr_set , function ( err , res ) {
		//solr callback
		console.log ( 'Added to SOLR') ;
		if ( err )
			console.log ( err ) ;
	}) ;

	self.mysql.getConnection ( function ( err , mysql_con ) {

		var connection = mysql_con ;

		connection.query ( self.mysql_query , mysql_set , function ( err , res ) {
			console.log ( 'Added to MySQL') ;
			console.log ( res.insertId ) ;

			article = { url: url , mysql_id: res.insertId } ;
			self.articles.push ( article ) ;

			self.articles_proccessed ++ ;
			if ( self.articles_proccessed === self.count )
			{
				console.log ( 'finished') ;
				self.emit ( 'finished' ) ;
			}

			if ( err )
				console.log ( err ) ;
			connection.end();
		}) ;

	})
}