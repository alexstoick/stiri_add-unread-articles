
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


function Main ( redis , mysql , solr , feedId )
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
	this.articles_proccessed_mysql = 0 ;
	this.articles_proccessed_solr = 0 ;
	this.count = 500 ;
	this.emmited_finish = false ;

	var self = this ;
	this.parser.on ( 'endParse' , function ( count ) {
		self.count = count ;
		if ( count === 0 && self.articles_proccessed_mysql === 0 && self.articles_proccessed_solr == 0 && !self.emmited_finish )
		 {
		 	self.emit ( 'finished' ) ;
		 }
		 else
			 setTimeout ( function () {
			 	if ( !self.emmited_finish )
			 	{
			 		if ( self.articles_proccessed_mysql === self.count && self.articles_proccessed_solr === self.count )
						{
							self.emmited_finish = true ;
							self.emit ( 'finished' ) ;
						}
				}
			 }, 1500 ) ;
	} ) ;
	this.parser.on ( 'newArticle' , this.newArticle ) ;

	this.articles = [] ;

}

Main.prototype.makeRequest = function ( url )
{
	this.parser.request ( url ) ;
}

Main.prototype.newArticle = function ( url , title , description , image , pubDate ) {

	var self = this.current_instance ;

	self.redis.exists ( url , function ( err , res) {

		if ( res == 0 )
		{
			request.get ( self.parserURL + url , function ( err , response, body ) {
				if ( err )
				{
					console.log ( 'request error' + err ) ;
					self.articles_proccessed_mysql ++ ;
					self.articles_proccessed_solr ++ ;
					if ( self.articles_proccessed_mysql === self.count && self.articles_proccessed_solr === self.count )
					{
						self.emmited_finish = true ;
						self.emit ( 'finished' ) ;
					}
					return ;
				}
				else
					if ( response.statusCode == 200 )
						self.addToSolrAndMySQL ( url , title , description , image , body , pubDate , self ) ;
					else
					{
						console.log ( 'eroare la parser ' + response.statusCode ) ;
						self.articles_proccessed_mysql ++ ;
						self.articles_proccessed_solr ++ ;
						if ( self.articles_proccessed_mysql === self.count && self.articles_proccessed_solr === self.count )
						{
							self.emmited_finish = true ;
							self.emit ( 'finished' ) ;
						}
						return ;
					}
			}) ;
		}
		else
		{
			self.articles_proccessed_mysql ++ ;
			self.articles_proccessed_solr ++ ;
			if ( self.articles_proccessed_mysql === self.count && self.articles_proccessed_solr === self.count )
			{
				self.emmited_finish = true ;
				self.emit ( 'finished' ) ;
			}
		}
	} ) ;
}

Main.prototype.addToSolrAndMySQL = function ( url , title , description , image , response , pubDate , instance )
{
	var self = instance ;
	parsed = JSON.parse ( response ) ;
	if ( parsed["error"] )
	{
		//gonna skip an article
		self.redis.set ( url , 'skipped' ) ;
		console.log ( "skipped an article" ) ;
		self.articles_proccessed_mysql ++ ;
		self.articles_proccessed_solr ++ ;
		if ( self.articles_proccessed_mysql === self.count && self.articles_proccessed_solr === self.count )
		{
			self.emmited_finish = true ;
			self.emit ( 'finished' ) ;
		}
		return ;
	}
	text = parsed ["response"] ;

	mysql_set =  { url: url , title: title , text: text , description: description , image: image , feed: self.feedId , created_at: pubDate } ;
	solr_set  =  { url: url , title: title , content: text , description: description , image: image , feed: self.feedId , last_modified: self.date }

	self.mysql.getConnection ( function ( err , mysql_con ) {

		if ( err )
		{
			console.log ( "eroare la luat conexiune " + err ) ;
			return;
		}

		var connection = mysql_con ;

		connection.query ( self.mysql_query , mysql_set , function ( err , res ) {
			if ( err )
			{
				console.log ( 'mysql error' + err ) ;
			}
			else
			{
				self.solr.add ( solr_set , function ( err , res ) {
					//solr callback
					if ( err )
						console.log ( 'eroare la solr' + err ) ;
					else
					{
						console.log ( 'Added to SOLR') ;
						self.articles_proccessed_solr ++ ;
						if ( self.articles_proccessed_mysql === self.count && self.articles_proccessed_solr === self.count )
						{
							self.emmited_finish = true ;
							self.emit ( 'finished' ) ;
						}
					}
				}) ;

				console.log ( 'Added to MySQL') ;
				article = { id: res.insertId } ;
				self.articles.push ( article ) ;

				//Setup key in redis
				self.redis.set ( url , res.insertId ) ;
			}

			self.articles_proccessed_mysql ++ ;
			if ( self.articles_proccessed_mysql === self.count && self.articles_proccessed_solr === self.count )
			{
				self.emmited_finish = true ;
				self.emit ( 'finished' ) ;
			}
			connection.end();
		}) ;

	})
}
