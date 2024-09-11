<?php
/**
 *
 * Plugin Name:  Image n Shapes
 * Description:  Create overlays linked to images
 * Version:      0.0.1
 *
 * Author:       Tim Burke-Lehmann 
 * License:      CC BY-NC 4.0
 * License URI:  http://creativecommons.org/licenses/by-nc/4.0
 *
 * Text Domain:  images_n_shapes
 *
 * @author  Tim Burke-Lehmann <timburke@gmx.de>
 */

 // // Avoid direct access
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

// Define Paths
define('INS_PLUGIN_PATH', dirname(__FILE__));
define('INS_PLUGIN_URL', plugins_url('', __FILE__));

//enqueue main script
function my_enq_scripts(){
	$inc = require 'build/index.asset.php';
	wp_enqueue_script('my-script-name', INS_PLUGIN_URL . '/build/index.js', $inc['dependencies'], $inc['version']);
 }
add_action('init','my_enq_scripts');

//Hook for the Ajax request
function hook_ajax( ){

    wp_localize_script( 'my-script-name', 'php_get_image_metadata', array(
            'ajaxurl' => admin_url( 'admin-ajax.php' ),
            'fail_message' => __('Connection to server failed. Check the mail credentials.', 'my-script-name'),
            'success_message' => __('Connection successful. ', 'my-script-name')
        )
    );

	wp_localize_script( 'my-script-name', 'php_handle_excalidraw_upload', array(
		'ajaxurl' => admin_url( 'admin-ajax.php' ),
		'fail_message' => __('Connection to server failed. Check the mail credentials.', 'my-script-name'),
		'success_message' => __('Connection successful. ', 'my-script-name')
		)
	);

    wp_localize_script( 'my-script-name', 'php_handle_excalidraw_replace', array(
		'ajaxurl' => admin_url( 'admin-ajax.php' ),
		'fail_message' => __('Connection to server failed. Check the mail credentials.', 'my-script-name'),
		'success_message' => __('Connection successful. ', 'my-script-name')
		)
	);
}
add_action( 'enqueue_scripts', 'hook_ajax' );
add_action( 'admin_enqueue_scripts', 'hook_ajax' );

//Ajax function to gather image data
function get_image_metadata() {
	if(isset($_POST['image_url'])) {
		$attachment_id = attachment_url_to_postid( $_POST['image_url']);
		$data_array = wp_get_attachment_metadata( $attachment_id);
		$file_type = wp_check_filetype( $_POST['image_url'] );
		wp_send_json(array('id' => $attachment_id, 'data' => $data_array, 'file_type' => $file_type));
	}
	wp_send_json_error(array('message' => 'Bild-URL fehlt.'));
	wp_die();
}
add_action( 'wp_ajax_get_image_metadata', 'get_image_metadata' );

//Ajax function to add blob as image
function handle_excalidraw_upload() {

    if(!isset($_FILES['image_blob'])) {
        wp_send_json_error(array('message' => 'No file sent'));
        wp_die();
    }

    // file-upload in wp-upload-folder
    $uploaded_file = wp_handle_upload($_FILES['image_blob'], array('test_form' => FALSE));

    if(isset($uploaded_file['file'])) {

        if(isset($_POST['old_attach_id']) && false) {
            $current_file = get_attached_file($_POST['old_attach_id']);
            
            if (file_exists($current_file)) {
                unlink($current_file); 
            }
            wp_send_json(array('success' => true, 'mode' => $uploaded_file['file'] . ' ||| ' . $current_file));
            copy($uploaded_file['file'], $current_file);
            unlink($uploaded_file['file']);

            $attach_data = wp_generate_attachment_metadata($_POST['old_attach_id'], $current_file);
            wp_update_attachment_metadata($_POST['old_attach_id'], $attach_data);
            wp_send_json(array('success' => true, 'attachment_id' => $_POST['old_attach_id'], 'mode' => 'replace'));
        }
        else {
        // add file to medialibrary
        $attachment = [
            'post_mime_type' => $uploaded_file['type'],
            'post_title' => $_FILES['image_blob']['name'],
            'post_content' => '',
            'post_status' => 'inherit'
        ];
        
        //Only generate new attachment if no old_attachment_id is provided
        $attach_id = wp_insert_attachment($attachment, $uploaded_file['file']);
        require_once(ABSPATH . 'wp-admin/includes/image.php');

        //generate attachment data
        $attach_data = wp_generate_attachment_metadata($attach_id, $uploaded_file['file']);

        wp_update_attachment_metadata($attach_id, $attach_data);
        wp_send_json(array('success' => true, 'attachment_id' => $attach_id, 'mode' => 'add'));
        }

    } else {
		wp_send_json_error($uploaded_file);
        wp_send_json_error(array('message' => 'Upload failed'));
    }
	

    wp_die();
	
}
add_action('wp_ajax_handle_excalidraw_upload', 'handle_excalidraw_upload');

function handle_excalidraw_replace() {

    if(!isset($_POST['post_id'])) {
        wp_send_json_error(array('message' => 'No data sent'));
        wp_die();
    }
   

}
add_action('wp_ajax_handle_excalidraw_replace', 'handle_excalidraw_replace');
