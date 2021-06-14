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
   FetchVendorInfo($db, $itemnumber);
   exit(0);

   
sub FetchVendorInfo
   {
   my ($db, $itemnumber) = @_;

   my $sql = "select bidderid, vendorname, count(bidderid) as ct from itembid where itemnumber=? group by bidderid order by vendorname";
   my $vendors = FetchArray ($db, $sql, $itemnumber);
   
   my $data = 
      {
      vendorarray => $vendors                                                                               ,
      };
   print "Content-Type: application/json\n\n";
   print to_json($data);
   }

   
sub FetchArray
   {
   my ($db, $sql, $itemnumber) = @_;
   
   my $sth = $db->prepare ($sql) or return undef;
   $sth->execute ($itemnumber);
   my $results = $sth->fetchall_arrayref();
   $sth->finish();
   return $results;
   }


sub Connect
   {
   my ($database) = @_;

   my $db = DBI->connect("DBI:mysql:host=localhost;database=$database", "craig", "a") or die "cant connect";

   return $db;
   }

