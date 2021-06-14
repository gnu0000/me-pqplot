#!perl
#
# sample ajax handler for plot demo

##############################################################################

use CGI ':cgi';  # Just want cgi handling routines, no html writing
use DBI;
use DBD::mysql;

MAIN:
   $| = 1;
   my $database = $ARGV[0] || "iadot";
   print "preparing bid items for $database\n";
   go($database);
   exit(0);
   
   
   
sub go
   {   
   my ($database) = @_;
   
   my $db = Connect($database);
   
   CreateCleanItemBidTable($db);
   
   my $items    = LoadItems($db);
   my $proposals= LoadProposals($db);
   my $totals   = LoadBidTotals($db);
   my $lettings = LoadLettings($db);
   
   CreateItemBids($db, $items, $proposals, $totals, $lettings);
#  Inspect($db, $items, $proposals, $totals, $lettings);
   }
   
   
sub CreateCleanItemBidTable
   {
   my ($db) = @_;
   
   $db->do("drop table if exists itembid");
   my $sql = 
      "create table itembid (" . 
      "  contid       varchar(32),   " . 
      "  linenumber   varchar(32),   " . 
      "  bidderid     varchar(32),   " . 
      "  itemnumber   varchar(32),   " . 
      "  bidprice     decimal(20,3), " . 
      "  quantity     decimal(20,3), " . 
      "  unit         varchar(255),  " . 
      "  lettingid    varchar(32),   " . 
      "  lettingdate  datetime,      " . 
      "  vendorname   varchar(255),  " . 
      "  rank         int(11)," . 
      "  primary key (contid, linenumber, bidderid)" .
      "  ) engine=MyISAM  DEFAULT CHARSET=utf8";
   $db->do($sql);
   }
   
   
sub LoadItems
   {
   my ($db) = @_;

   print "loading items\n";
   my $items = {};
   my $sth = $db->prepare ("select * from item") or die "cant prep statement";
   $sth->execute();
   while (my $row =  $sth->fetchrow_hashref())
      {
      my $key = $row->{contid} . "|" . $row->{linenumber};
      $items->{$key} = $row;
      }
   $sth->finish();

   my $ct = scalar (keys %{$items});
   print "found $ct items\n";

   return $items;
   }
   
   
sub LoadProposals
   {
   my ($db) = @_;

   print "loading proposals\n";
   my $proposals = {};
   my $sth = $db->prepare ("select contid,lettingid from proposal") or die "cant prep statement";
   $sth->execute();
   while (my $row =  $sth->fetchrow_hashref())
      {
      my $key = $row->{contid};
      $proposals->{$key} = $row;
      }
   $sth->finish();

   my $ct = scalar (keys %{$proposals});
   print "found $ct proposals\n";

   return $proposals;
   }
   
   
sub LoadBidTotals
   {
   my ($db) = @_;

   print "loading bidtotals\n";
   my $bidtotals = {};
   my $sth = $db->prepare ("select * from bidtotal") or die "cant prep statement";
   $sth->execute();
   while (my $row =  $sth->fetchrow_hashref())
      {
      my $key = $row->{contid} . "|" . $row->{bidderid};
      $bidtotals->{$key} = $row;
      }
   $sth->finish();

   my $ct = scalar (keys %{$bidtotals});
   print "found $ct bidtotals\n";

   return $bidtotals;
   }
   
   
sub LoadLettings
   {
   my ($db) = @_;

   print "loading lettings\n";
   my $lettings = {};
   my $sth = $db->prepare ("select * from letting") or die "cant prep statement";
   $sth->execute();
   while (my $row =  $sth->fetchrow_hashref())
      {
      my $key = $row->{lettingid};
      $lettings->{$key} = $row;
      }
   $sth->finish();

   my $ct = scalar (keys %{$lettings});
   print "found $ct lettings\n";

   return $lettings;
   }
   
   
sub CreateItemBids
   {
   my ($db, $items, $proposals, $totals, $lettings) = @_;

   print "creating itembids\n";
   
   my $query_sql = "select * from bidtab";
   my $insert_sql =
      "insert into itembid" .
      " (contid,linenumber,bidderid,itemnumber,bidprice,quantity,unit,lettingid,lettingdate,vendorname,rank)" .
      " values(?,?,?,?,?,?,?,?,?,?,?)";
   
   print "creating itembids\n";
   my $sth1 = $db->prepare ($query_sql)  or die "cant prep query statement";
   my $sth2 = $db->prepare ($insert_sql) or die "cant prep insert statement";
   $sth1->execute();
   my $rowcount             = 0;
   my $missingitemcount     = 0;
   my $missingproposalcount = 0;
   my $missingbidtotalcount = 0;
   my $missinglettingcount  = 0;
   
   while (my $row =  $sth1->fetchrow_hashref())
      {
      $rowcount++;
      
      my $contid      = $row->{contid}    ;
      my $linenumber  = $row->{linenumber};
      my $bidderid    = $row->{bidderid}  ;
      my $bidprice    = $row->{bidprice}  ;
      my $vendorname  = $row->{vendorname};
      
      my $item        = $items->    {$contid . "|" . $linenumber}; if (!$item    ){$missingitemcount++    ; print "\nmissing item     ($contid | $linenumber) \n"; next;}
      my $proposal    = $proposals->{$contid                    }; if (!$proposal){$missingproposalcount++; print "\nmissing proposal ($contid)               \n"; next;} 
      my $bidtotal    = $totals->   {$contid . "|" . $bidderid  }; if (!$bidtotal){$missingbidtotalcount++; print "\nmissing bidtotal ($contid | $bidderid)   \n"; next;} 
      my $letting     = $lettings-> {$proposal->{lettingid}     }; if (!$letting ){$missinglettingcount++ ; print "\nmissing letting  ($proposal->{lettingid})\n"; next;} 
      
      my $itemnumber  = $item->{itemnumber};
      my $quantity    = $item->{quantity};
      my $unit        = $item->{unit};
      my $lettingid   = $letting->{lettingid};
      my $lettingdate = $letting->{lettingdate};
      my $rank        = $bidtotal->{rank};
      
      $sth2->execute($contid, $linenumber, $bidderid, $itemnumber, $bidprice, $quantity, $unit, $lettingid, $lettingdate, $vendorname, $rank);
      
      print "." unless ($rowcount % 100);
      }
   $sth1->finish();
   print "\n";
   print "rows:              $rowcount            \n";
   print "missing items:     $missingitemcount    \n";
   print "missing proposals: $missingproposalcount\n";
   print "missing bidtotals: $missingbidtotalcount\n";
   print "missing lettings:  $missinglettingcount \n";
   }
   
   
# debug, make sure keys look ok
sub Inspect
   {
   my ($db, $items, $proposals, $totals, $lettings) = @_;
   
   my $ct = scalar (keys %{$items});
   print "sample item keys:\n";
   foreach my $idx (1..10) {_showakey($items)}
   print "sample proposal keys:\n";
   foreach my $idx (1..10) {_showakey($proposals)}
   print "sample bidtotal keys:\n";
   foreach my $idx (1..10) {_showakey($totals)}
   print "sample letting keys:\n";
   foreach my $idx (1..10) {_showakey($lettings)}
   }   
   
   
sub _showakey
   {
   ($hashref) = @_;
   
   my $ct = scalar (keys %{$hashref});
   $val = int(rand($ct));
   $key = (keys %{$hashref})[$val];
   print "   key: '$key'\n";
   }   
   
   
sub Connect
   {
   my ($database) = @_;

   my $db = DBI->connect("DBI:mysql:host=localhost;database=$database", "craig", "a") or die "cant connect";
   return $db;
   }

   

