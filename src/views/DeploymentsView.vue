<script lang="ts">

</script>

<template>
  <!-- Switches between different deployment views: List, Detail, Create.
       Keyed by path so switching from one deployment's detail page to
       another mounts the page again (it reads the id once on setup). -->
  <router-view :key="$route.path" />
</template>