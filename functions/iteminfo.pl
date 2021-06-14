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
   FetchItemInfo($db, $itemnumber);
   exit(0);

   
sub FetchItemInfo
   {
   my ($db, $itemnumber) = @_;
   
   my $descriptions = FetchArray ($db, "select distinct(longdescription) from item where itemnumber=?", $itemnumber);
   my $units        = FetchArray ($db, "select distinct(unit)            from item where itemnumber=?", $itemnumber);
   
   my $description_count = scalar @{$descriptions};
   my $unit_count        = scalar @{$units};
   
   my $data = 
      {
      description      => ($description_count < 3 ? $descriptions->[0] : "Multiple descriptions ($description_count)"),
      descriptionarray => $descriptions                                                                               ,
      unit             => ($unit_count < 3 ? $units->[0] : "multiple")                                                ,
      unitarray        => $units                                                                                      ,
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

