#!perl
#
# sample ajax handler for plot demo

##############################################################################

use CGI ':cgi';  # Just want cgi handling routines, no html writing
use DBI;
use JSON;
use DBD::mysql;

MAIN:
   my $agency     = param("agency")     || "iadot";
   my $itemnumber = param("itemnumber") || "2601--109010";

   my $db = Connect($agency);
   FetchBids($db, $itemnumber);
   exit(0);


   
sub FetchBids
   {
   my ($db, $itemnumber) = @_;

   my $statement = "select * from itembid where itemnumber='$itemnumber'" .
                   " order by rank desc";

   my $sth = $db->prepare ($statement) or return undef;
   $sth->execute ();
   my $results = $sth->fetchall_arrayref({});
   $sth->finish();

   print "Content-Type: application/json\n\n";
   print to_json($results);
   }


sub Connect
   {
   my ($database) = @_;

   my $db = DBI->connect("DBI:mysql:host=localhost;database=$database", "craig", "a") or die "cant connect";

   return $db;
   }

