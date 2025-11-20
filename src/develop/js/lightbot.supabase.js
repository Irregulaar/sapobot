(function() {
  if (!window.supabase) {
    console.error('Supabase client library not found. Make sure the CDN script is included before lightbot.supabase.js');
    return;
  }

  var SUPABASE_URL = 'https://cbozwfxldpfrtvdxuttu.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_CQSJMPLNDZOr47NkQQ58sg_JWlCnH9M';

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  if (!window.lightBot) {
    window.lightBot = {};
  }

  lightBot.community = {
    // Returns a Promise<{ data, error }>
    publishMap: function(name, mapObject) {
      if (!name || !mapObject) {
        return Promise.resolve({ error: 'Missing map name or map data' });
      }

      var payload = { name: name, map: mapObject };

      return client
        .from('community_maps')
        .insert(payload)
        .select('*')
        .single()
        .then(function(result) {
          if (result.error) {
            console.error('Error publishing map to Supabase:', result.error);
          }
          return result;
        }, function(e) {
          console.error('Unexpected error while publishing map:', e);
          return { data: null, error: e };
        });
    },

    // Returns a Promise<{ data, error }>
    listMaps: function() {
      return client
        .from('community_maps')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .then(function(result) {
          if (result.error) {
            console.error('Error loading community maps:', result.error);
          }
          return result;
        }, function(e) {
          console.error('Unexpected error while loading community maps:', e);
          return { data: null, error: e };
        });
    },

    // Returns a Promise<{ data, error }>
    getMapById: function(id) {
      if (!id) {
        return Promise.resolve({ error: 'Missing map id' });
      }

      return client
        .from('community_maps')
        .select('id, name, map, created_at')
        .eq('id', id)
        .single()
        .then(function(result) {
          if (result.error) {
            console.error('Error loading map by id from Supabase:', result.error);
          }
          return result;
        }, function(e) {
          console.error('Unexpected error while loading map by id:', e);
          return { data: null, error: e };
        });
    }
  };
})();
