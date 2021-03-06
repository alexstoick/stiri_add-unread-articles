

var FeedParser = require('feedparser') ,
	request = require ( 'request') ;
var events = require('events') ;

module.exports = Parser;

function Parser ( current_instance ) {
	events.EventEmitter.call(this);
	this.current_instance = current_instance ;
	this.start = 0 ;
	this.articole = [] ;
}

// inherit events.EventEmitter
Parser.super_ = events.EventEmitter;
Parser.prototype = Object.create(events.EventEmitter.prototype, {
	constructor: {
		value: Parser,
		enumerable: false
	}
});

Parser.prototype.request = function ( url )
{
	var self = this ;

	self.count = 0 ;

	self.startDate = new Date() ;

	request(url , { "timeout" : 5000 })
		.on('error', function (error) {
			console.log( "error la request feedului " + error + " 	" + url );
			self.emit ( 'endParse' , 0 ) ;
		})
		.pipe(new FeedParser())
		.on('error', function (error) {
			console.log ( " error la feedparser " + error + " 		" + url ) ;
			self.emit ( 'endParse' , 0 ) ;
		})
		.on('meta', function (meta) {
			self.emit ( 'feedTitle' , meta.title ) ;
		})
		.on('readable', function() {
			var stream = this, item;
			while (item = stream.read()) {
				date = ( item.pubDate || item.published || item.date || new Date() ) ;
				image=null ;
				if ( item["enclosures"].length > 0 )
					image = item["enclosures"][0]["url"] ;
				image = image || item.image["url"] || item.image  ;
				if ( image.length === undefined )
					if ( image != null && isEmpty(image) )
						image = null ;
				self.count ++ ;
				self.emit ( 'newArticle' , item.link , item.title , item.description , image , date ) ;
				self.start ++ ;

			}
		})
		.on('end' , function () { self.emmitRequestFinished(self) } );

		return self;
}

Parser.prototype.emmitRequestFinished = function ( parent )
{
	var self = parent ;
	self.end = new Date() ;
	self.emit ( 'endParse' , self.count ) ;
}


function isEmpty(obj) {
    return !Object.keys(obj).length > 0;
}