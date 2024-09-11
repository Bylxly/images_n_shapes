import 'jquery.initialize';
import 'ajax';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client'
import { Excalidraw, MainMenu, exportToBlob, loadFromBlob } from "@excalidraw/excalidraw";

jQuery( document ).ready(function (){

    function get_image_metadata(image_url){
        //Ajax request to gather data of the picture
        return new Promise((resolve, reject) => {
            jQuery.ajax({
                type: "POST",
                url: php_get_image_metadata.ajaxurl,
                data: {action: 'get_image_metadata', image_url: image_url},
            
                success: function (obj, textstatus) {
                            if( !('error' in obj) ) {
                                var attachment_id = obj.id;
                                var data_array = obj.data;
                                var file_type = obj.file_type;
                                resolve({attachment_id, data_array, file_type});
                            }
                            else {
                                reject("Error");
                            }
                        }
            });
        });
    }

    //Ajax call to import blob to wordpress
    function save_blob (blob, file_type, old_attach_id) {

        var formData = new FormData(); 
        var currentDate = new Date();

        //add ending to filename
        const split_file_type = file_type.split('/')
        var filename = currentDate.getTime() + "." + split_file_type[1]; 

        var newBlob = new Blob([blob], {type: file_type});

        formData.append('action', 'handle_excalidraw_upload');
        formData.append('image_blob', newBlob, filename);
        formData.append('old_attach_id', old_attach_id);

        jQuery.ajax({
            type: "POST",
            url: php_handle_excalidraw_upload.ajaxurl,
            data: formData,
            contentType: false,
            processData: false,
            
            success: function(obj) {
                //console.log("success")
                console.log(obj.attachment_id);
                console.log("Modus: " + obj.mode);
            },
            error: function(err) {
                //console.log("no success");
                console.log(err);
            }
        });
    }

    // Prepare media-frame-content div for whiteboard
    function prepare() {
        var temp = document.getElementsByClassName("media-frame-content");
        temp[1].innerHTML = '<div id="app", style="height:100%;"></div>';

        //create rootElement for React
        const rootElement = document.getElementById('app'); 
        const root = createRoot(rootElement);

        return (root);
    }

    //Add whiteboard to Page
    function App (props) {

        const { image_url, attachment_id, data_array, file_type } = props

        //initialize API 

        const [excalidrawAPI, setExcalidrawAPI] = useState(null);
        
        const [ initData, setInitData ] = useState(null);

        /** 
         * If scenedata is available renders that else
         * renders Excalidraw preloaded with selected Picutre
         * 
         * add Save button to Main menu which adds edited picture to library as png
         */ 

        useEffect(() => {

            //import scenedata from picture
            async function loadBlob() {

                try {
                    fetch(image_url)
                    .then(res => res.blob())
                    .then(pic_blob => {

                        //console.log(pic_blob);
                        loadFromBlob(pic_blob, null, null)
                            .then(data => {
                                //console.log("With data");
                                setInitData(data);
                            })
                            .catch((error) => {
                                console.error(error);
                                var temp = ({
                                    "elements" : [
                                        {
                                            "id": "start",
                                            "type": "image",
                                            "x": 0,
                                            "y": 0,
                                            "width": data_array['width'],
                                            "height": data_array['height'],
                                            "angle": 0,
                                            "strokeColor": "transparent",
                                            "backgroundColor": "transparent",
                                            "fillStyle": "solid",
                                            "strokeWidth": 2,
                                            "strokeStyle": "solid",
                                            "roughness": 1,
                                            "opacity": 100,
                                            "groupIds": [],
                                            "frameId": null,
                                            "roundness": null,
                                            "version": 33,
                                            "isDeleted": false,
                                            "boundElements": null,
                                            "link": null,
                                            "locked": false,
                                            "status": "saved",
                                            "fileId": "start",
                                            "scale": [
                                            1,
                                            1
                                            ]
                                        }
                                    ],
                                    "scrollToContent": true,
                                    "files" : {
                                        "start": {
                                        "mimeType": file_type['type'],
                                        "id": "start",
                                        "dataURL": image_url
                                        }
                                    }
                                })
                                setInitData(temp)
                                //console.log(temp)        
                            })
                    })
                }
                catch (error){
                    console.error(error);
                }
            }
            loadBlob();
        }, [image_url]);  
        
        if (initData == null) {
            return <div style={{ height: '100%'}}>
                Loading...
            </div>
        }
        else {
            return (<>
                <div className='excalidraw-tooltip'></div>
                <div style={{ height: '100%'}}>
                    <Excalidraw
                        ref={(api) => setExcalidrawAPI(api)}
                        initialData = {initData}
                    >
                        <MainMenu>
                            <MainMenu.Item onSelect={() => {    

                                const elements = excalidrawAPI.getSceneElements();
                                const appState = excalidrawAPI.getAppState();

                                const blob = exportToBlob({
                                    elements,
                                    files: excalidrawAPI.getFiles(),
                                    appState: {exportEmbedScene: true},
                                    //mimeType: file_type['type'],
                                    mimeType: "image/png",
                                    quality: 1,
                                    exportPadding: 0
                                }).then(function (blob) {
                                    save_blob(blob, "image/png", attachment_id)
                                });
                            }}>
                                Save as new
                            </MainMenu.Item>
                            <MainMenu.DefaultItems.ToggleTheme />
                            <MainMenu.DefaultItems.ChangeCanvasBackground />
                        </MainMenu>
                    </Excalidraw>
                </div>
            </>);
        }
    }

    // Add Button right of the standart Edit button
    jQuery(function a () {
        jQuery.initialize(".edit-attachment", function () {
            jQuery(".button.edit-attachment").after('<button class="button ins_attachment_button">Edit with InS</button>');
            jQuery(".button.edit-attachment").css('margin-right', '10px');
            jQuery(".ins_attachment_button").on('click', function () {
                var image_url = jQuery(".details-image").attr('src');

                // Wait for Ajax request for image metadata to complete
                get_image_metadata(image_url)
                    .then((data) => {
                        console.log(data);
                        var attachment_id = data['attachment_id'];
                        var data_array = data['data_array'];
                        var file_type = data['file_type'];

                        // Render whiteboard
                        const root = prepare();
                        jQuery(".details-image").replaceWith(root.render(<App image_url={image_url} attachment_id={attachment_id} data_array={data_array} file_type={file_type} />));
                    })
                    .catch((error) => {
                        console.error(error)
                    });
            });
        });

        //check if modal menu is opened and change z index
        jQuery.initialize(".excalidraw.excalidraw-modal-container", function () {
            jQuery(".excalidraw.excalidraw-modal-container").css({"z-index":"170000"});
        });
    })
});
