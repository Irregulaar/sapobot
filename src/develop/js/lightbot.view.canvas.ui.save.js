/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

$(document).ready(function() {
  // Export/Import data functionality
  
  // Create hidden file input for importing
  var $fileInput = $('<input type="file" accept=".json" style="display: none;">');
  $('body').append($fileInput);
  
  // Export button handler
  $(document).on('click', '#exportDataButton', function() {
    lightBot.ui.save.exportData();
  });
  
  // Import button handler
  $(document).on('click', '#importDataButton', function() {
    $fileInput.click();
  });
  
  // File input change handler
  $fileInput.on('change', function(e) {
    var file = e.target.files[0];
    if (file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = JSON.parse(e.target.result);
          lightBot.ui.save.importData(data);
        } catch (error) {
          alert('Error al cargar el archivo: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
    // Reset input so same file can be selected again
    $(this).val('');
  });
});

(function() {
  
  var save = {
    // Export all localStorage data to a JSON file
    exportData: function() {
      var data = {};
      
      // Get all localStorage items that start with 'lightbot_'
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('lightbot_') === 0) {
          data[key] = localStorage.getItem(key);
        }
      }
      
      // Create JSON string
      var jsonString = JSON.stringify(data, null, 2);
      
      // Create blob and download
      var blob = new Blob([jsonString], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'lightbot_save_' + new Date().toISOString().split('T')[0] + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show success message
      alert('Datos exportados correctamente!');
    },
    
    // Import data from JSON object
    importData: function(data) {
      // Confirm before overwriting
      if (!confirm('¿Estás seguro de que quieres importar estos datos? Esto sobrescribirá todos tus datos guardados actuales.')) {
        return;
      }
      
      var importedCount = 0;
      var errorCount = 0;
      
      // Import all data
      for (var key in data) {
        if (data.hasOwnProperty(key) && key.indexOf('lightbot_') === 0) {
          try {
            localStorage.setItem(key, data[key]);
            importedCount++;
          } catch (error) {
            console.error('Error importing key:', key, error);
            errorCount++;
          }
        }
      }
      
      // Show result
      var message = 'Datos importados correctamente!\n';
      message += 'Items importados: ' + importedCount;
      if (errorCount > 0) {
        message += '\nErrores: ' + errorCount;
      }
      message += '\n\nLa página se recargará para aplicar los cambios.';
      alert(message);
      
      // Reload page to apply changes
      window.location.reload();
    }
  };
  
  lightBot.ui.save = save;
})();

