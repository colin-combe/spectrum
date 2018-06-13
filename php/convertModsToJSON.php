<?php
$pepsStr = urldecode($_GET["peps"]);

$pepsStr_noCL = preg_replace( '/#[0-9]?/' , '' , $pepsStr);
preg_match_all('/[^A-Z;]+/', $pepsStr_noCL, $matches, PREG_OFFSET_CAPTURE);

$modifications = array();
$aminoAcids = array();
$i = 0;


foreach ($matches[0] as $matchgroup) {

	$index = array_search($matchgroup[0], $modifications);


	if ($index === FALSE){
		array_push($modifications, $matchgroup[0]);
		array_push($aminoAcids, $pepsStr_noCL[$matchgroup[1]-1]);
	}
	else{
		if (strpos($aminoAcids[$index], $pepsStr_noCL[$matchgroup[1]-1]) === FALSE)
			$aminoAcids[$index] .= ",".$pepsStr_noCL[$matchgroup[1]-1];

	}
	$i++;
}

$modificationsJSON = array();
$i = 0;
foreach ($aminoAcids as $aminoAcid) {
	array_push($modificationsJSON, array('DT_RowId' => "mod_".$i, 'id' => $modifications[$i], 'aminoAcid' => $aminoAcid));
	$i++;
}


//final array
$arr = array('data' => $modificationsJSON);

//var_dump($arr);
echo json_encode($arr);
?>
