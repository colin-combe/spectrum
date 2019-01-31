<?php
	require("functions.php");

	$post_mods = [];
	if(isset($_POST['mods'])){
		$post_mods = $_POST['mods'];
		$modMasses = $_POST['modMasses'];
		$modSpecificities = $_POST['modSpecificities'];
	}

	$post_losses = [];
	if(isset($_POST['losses'])){
		$post_losses = $_POST['losses'];
		$lossMasses = $_POST['lossMasses'];
		$lossSpecificities = $_POST['lossSpecificities'];
	}

	$pepsStr = $_POST["peps"];
	$clModMass = floatval($_POST['clModMass']);
	$ms2Tol = floatval($_POST['ms2Tol']);
	$tolUnit = $_POST['tolUnit'];
	$peaklist = $_POST['peaklist'];
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
	foreach ($post_mods as $mod) {
		array_push(
			$modifications,
			array(
				'aminoAcids' => str_split($modSpecificities[$i]),
				'id' => $mod,
				'mass' => $modMasses[$i]
			)
		);
		$i++;
	}

	$losses = array();
	$i = 0;
	foreach ($post_losses as $loss) {
		array_push(
			$losses,
			array(
				'specificity' => array_map('trim',explode(",",$lossSpecificities[$i])),
				'id' => $loss,
				'mass' => floatval($lossMasses[$i])
			)
		);
		$i++;
	}

	$ions = array();
	foreach ($_POST['ions'] as $iontype) {
		$iontype = ucfirst($iontype)."Ion";
		array_push($ions, array('type' => $iontype));
	}

	$cl = array('modMass' => $clModMass);

	$annotation = array(
		'fragmentTolerance' => $tol,
		'modifications' => $modifications,
		'ions' => $ions,
		'crosslinker' => $cl,
		'precursorCharge' => $preCharge,
		'losses' => $losses
	);

	//final array
	$postData = array(
		'Peptides' => $peptides,
		'LinkSite' => $linkSites,
		'peaks' => $peaks,
		'annotation' => $annotation
	);

	$postJSON = json_encode($postData);

	echo $postJSON;

?>
