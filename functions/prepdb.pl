#!perl
#
# sample ajax handler for plot demo

##############################################################################

use CGI ':cgi';  # Just want cgi handling routines, no html writing
use DBI;
use DBD::mysql;

MAIN:
   $| = 1;
   CreateItemBids("iadot");
   exit(0);

sub CreateItemBids
   {
   my ($db_name) = @_;

   my $db = Connect($db_name);
   my $items = GetUniqieItemNumbers($db);
   foreach my $item (@{$items})
      {
      if ($item->{unit} =~ /^(ls)|(lump)|(l\.s\.)$/i)
         {
         print "skipping $item->{unit} item $item->{itemnumber}\n";
         }
      print "making bidtabs for $item->{itemnumber} ...";
      CreateBidsForItem($db, $item->{itemnumber});
      print "\n";
      }
   }


sub Connect
   {
   my ($database) = @_;

   my $db = DBI->connect("DBI:mysql:host=localhost;database=$database", "craig", "a") or die "cant connect";
   return $db;
   }

sub GetUniqieItemNumbers
   {
   my ($db) = @_;

   my $statement = "select distinct(itemnumber), unit from item";

   my $sth = $db->prepare ($statement) or die "cant prep statement";
   $sth->execute ();
   my $results = $sth->fetchall_arrayref({});
   $sth->finish();

   my $ct = scalar @{$results};
   print "found $ct items\n";

   return $results;
   }



sub CreateBidsForItem
   {
   my ($db, $itemnumber) = @_;

   my $statement = 
    "insert into itembid (contid, linenumber, bidderid, itemnumber, bidprice, quantity, unit, lettingid, lettingdate, vendorname, rank)" .
    " select bidtab.contid, item.linenumber, bidtab.bidderid, item.itemnumber, bidtab.bidprice, item.quantity, item.unit, bidtotal.lettingid, letting.lettingdate, bidtab.vendorname, bidtotal.rank" .
    " from bidtab, item, bidtotal, letting" .
    " where bidtab.contid=item.contid and bidtab.linenumber=item.linenumber and bidtab.contid=bidtotal.contid and bidtab.bidderid=bidtotal.bidderid and item.itemnumber='$itemnumber'" .
    " and letting.lettingid=bidtotal.lettingid";

   my $sth = $db->prepare ($statement) or die "cant prep statement";
   $sth->execute ();
   $sth->finish();
   }

