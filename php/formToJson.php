<?php

require("functions.php");

$dbView = FALSE;
$mods = [];
if(isset($_POST['mods'])){
    $mods = $_POST['mods'];
    $modMasses = $_POST['modMasses'];
    $modSpecificities = $_POST['modSpecificities'];
}

$pepsStr = $_POST["peps"];
$clModMass = floatval($_POST['clModMass']);
$ms2Tol = floatval($_POST['ms2Tol']);
$tolUnit = $_POST['tolUnit'];
$peaklist = $_POST['peaklist'];

//$method = $_POST['fragMethod'];
$preCharge = intval($_POST['preCharge']);

$peaklist = explode("\r\n", $peaklist);

//peptides linksites block
$peps = explode(";", $pepsStr);
$linkSites = array();
$peptides = array();

$i = 0;
foreach ($peps as $pep) {
    array_push($peptides, pep_to_array($pep));
    $linkSites = array_merge($linkSites, get_link_sites($pep, $i));
    $i++;
}


//peak block
$peaks = array();
foreach ($peaklist as $peak) {
    $peak = trim($peak);
    if ($peak != ""){
        $parts = preg_split('/\s+/', $peak);
        if(count($parts) > 1)
            array_push($peaks, array('mz' => floatval($parts[0]), 'intensity' => floatval($parts[1])));
    }
}

//annotation block
$tol = array("tolerance" => $ms2Tol, "unit" => $tolUnit);
$modifications = array();
$i = 0;
//var_dump(str_split($modSpecificities[$i]))
//var_dump(implode(",", str_split($modSpecificities[$i]));
//die();
foreach ($mods as $mod) {
    array_push($modifications, array('aminoAcids' => str_split($modSpecificities[$i]), 'id' => $mod, 'mass' => $modMasses[$i]));
    $i++;
}

$ions = array();
foreach ($_POST['ions'] as $iontype) {
	$iontype = ucfirst($iontype)."Ion";
	array_push($ions, array('type' => $iontype));
}

// array_push($ions, array('type' => 'PeptideIon'));
// if ($method == "HCD" or $method == "CID") {
//     array_push($ions, array('type' => 'BIon'));
//     array_push($ions, array('type' => 'YIon'));
// };
// if ($method == "EThcD" or $method == "ETciD") {
//     array_push($ions, array('type' => 'BIon'));
//     array_push($ions, array('type' => 'CIon'));
//     array_push($ions, array('type' => 'YIon'));
//     array_push($ions, array('type' => 'ZIon'));
// };
// if ($method == "ETD") {
//     array_push($ions, array('type' => 'CIon'));
//     array_push($ions, array('type' => 'ZIon'));
// };

$cl = array('modMass' => $clModMass);

$annotation = array('fragmentTolerance' => $tol, 'modifications' => $modifications, 'ions' => $ions, 'cross-linker' => $cl, 'precursorCharge' => $preCharge);

//final array
$postData = array('Peptides' => $peptides, 'LinkSite' => $linkSites, 'peaks' => $peaks, 'annotation' => $annotation);

$postJSON = json_encode($postData);

echo $postJSON;

?>
