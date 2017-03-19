<?php

	for($h = 0; $h<2; $h++){
		$res = "";
		if($h == 1){
			$res = "@2x";
		}
		for($i = 0; $i<24; $i++){
			$name = "./tmp/animation_".$i.$res.".png";
			$img = imagecreatefrompng($name);
			imageAlphaBlending($img, true);
			imageSaveAlpha($img, true);
			imagepng($img, $name);
		}
	}

?>
