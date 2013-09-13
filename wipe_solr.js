
var solr = require ('solr-client');

PORT_SOLR = 8983 ;
HOST = '37.139.8.146' ;

var solrClient = solr.createClient ( HOST  , PORT_SOLR ) ;

solrClient.autoCommit = true ;

// Delete every document
solrClient.delete('-feed','[* TO *]',function(err,obj){
   if(err){
   	console.log(err);
   }else{
   	console.log(obj);
   }
});