/* Export */
if (module) module.exports = Brain;

/* Import */
var Neuron    = require('./neuron')
,   Layer     = require('./layer')
,   Network   = require('./network')
,   Architect = require('./architect')
,   Methods   = require('./methods/methods.js');

/* Shorten var names */
var Mutate     = Methods.Mutate
,   Squash     = Methods.Squash
,   Crossover  = Methods.Crossover
,   Selection  = Methods.Selection
,   Generation = Methods.Generation
,   Pooling    = Methods.Pooling
,   Cost       = Methods.Cost
,   Connection = Methods.Connection;

/*******************************************************************************************
                                         BRAIN
*******************************************************************************************/

/**
 * Creates a neural network
 */
function Brain(options) {
  this.size = [options.input, options.hidden.length, options.output];
  this.nodes = [];
  this.ratio = options.ratio || 3;

  for(var i = 0; i < options.input; i++){
    var node = new Neuron();
    node.input = true;
    this.nodes.push(node);
  }

  for(var i in options.hidden){
    options.hidden[i].input = false;
    this.nodes.push(options.hidden[i]);
  }

  for(var i = 0; i < options.output; i++){
    var node = new Neuron();
    node.input = false;
    this.nodes.push(node);
  }

  this.connect(options.memory, options.ratio);
}

Brain.prototype = {
  /**
   * Connects all the nodes
   * all nodes are connected forwardly using http://stackoverflow.com/a/7228322/4576519
   */
  connect: function(memory){
    memory = memory || 0;
    // Give every node at least one output connection
    for(var j = 0; j < this.ratio; j++){
      for(var i = 0; i < this.size[0] + this.size[1]; i++){
        var output = i;
        var minBound = Math.max(i+1, this.size[0]);
        var input = Math.floor(Math.random() * (this.size[0] + this.size[1] + this.size[2] - minBound) + minBound); // an input node can't connected to an output node, this creates BIAS (?)

        this.nodes[output].project(this.nodes[input]);
        this.nodes[input].input = true;
      }
    }

    // Detect nodes without input connections, connect them
    for(var i = this.size[0]; i < this.size[0] + this.size[1] + this.size[2]; i++){
      var input = i;
      if(this.nodes[input].input == false){
        var output = Math.floor(Math.random() * i);

        this.nodes[output].project(this.nodes[input]);
        this.nodes[input].input = true;
      }
    }

    // Create 'memory connections' : connections that point backwards
    while(memory > 0){
      var output = Math.floor(Math.random() * (this.size[1] + this.size[2]) + this.size[0]);
      var input = Math.floor(Math.random() * output);

      this.nodes[output].project(this.nodes[input]);
      memory--;
    }
  },

  /**
   * Feed-forward activation of all nodes to get an output
   */
  activate: function(input) {
    if(input.length != this.size[0]){ throw new Error('Incorrect input size!') };
    var output = [];

    for(var i = 0; i < this.size[0] + this.size[1] + this.size[2]; i++){
      if(i < this.size[0]){ // input
        this.nodes[i].activate(input[i]);
      } else if(i >= this.size[0] + this.size[1]){ //output
        output.push(this.nodes[i].activate());
      } else { // hidden
        this.nodes[i].activate()
      }
    }

    return output;
  },

  /**
   * Back-propagate the error through the network
   */
  propagate: function(rate, target) {
    if(target.length != this.size[2]){ throw new Error('Incorrect target size!') };

    for(var i = this.size[0] + this.size[1] + this.size[2] - 1; i >= 0 ; i--){
      if(i < this.size[0]){
      } else if(i >= this.size[0] + this.size[1]){ //output
        this.nodes[i].propagate(rate, target[i - (this.size[0] + this.size[1] + this.size[2] - 1)])
      } else { // hidden
        this.nodes[i].propagate(rate);
      }
    }
  },

  /**
   * Clear all elegibility traces and extended elegibility traces
   * (the network forgets its context, but not what was trained)
   */
  clear: function() {
    for(var node in this.nodes){
      this.nodes[node].reset();
    }
  },

  /**
   * Resets all weights and clears all traces
   */
  reset: function() {
    for(var node in this.nodes){
      this.nodes[node].reset();
    }
  },

  /**
   * Breaks all connections so they can be reconnected again
   */
  disconnect: function(){
    for(var node in this.nodes){
      this.nodes[node].disconnect();
    }
  },

  /**
   * Mutates the brain
   */
  mutate: function(method){
    method = method || Mutate.MODIFY_RANDOM_WEIGHT;
    switch(method){
      case(Mutate.SWAP_WEIGHT):
        // Select two random nodes, only look at connections.projected
        var node1 = Math.floor(Math.random() * (this.size[1] + this.size[0]));
        var node2 = node1;
        while(node1 == node2){
          node2 = Math.floor(Math.random() * (this.size[1] + this.size[0]));
        }

        node1 = this.nodes[node1];
        node2 = this.nodes[node2];

        if(node1 instanceof Network){
          node1 = node1.layers.output.list[Math.floor(Math.random() * node1.layers.output.list.length)];
        } else if(node1 instanceof Layer){
          node1 = node1.list[Math.floor(Math.random() * node1.list.length)];
        } else if (node1 instanceof Neuron){
        }

        if(node2 instanceof Network){
          node2 = node2.layers.output.list[Math.floor(Math.random() * node2.layers.output.list.length)];
        } else if(node2 instanceof Layer){
          node2 = node2.list[Math.floor(Math.random() * node2.list.length)];
        }

        var connections1 = Object.keys(node1.connections.projected);
        var connection1 = node1.connections.projected[connections1[Math.floor(Math.random() * connections1.length)]];

        var connections2 = Object.keys(node2.connections.projected);
        var connection2 = node2.connections.projected[connections2[Math.floor(Math.random() * connections2.length)]];

        var temp = connection1.weight;
        connection1.weight = connection2.weight;
        connection2.weight = temp;
        break;
      case(Mutate.MODIFY_RANDOM_WEIGHT):
        // to be developed
        break;
      case(Mutate.MODIFY_CONNECTIONS):
        // to be developed
        break;
      case(Mutate.MODIFY_NODES):
        if(Math.random() >= 0.5){ // remove a node
          // can't be output or input
          var index = Math.floor(Math.random() * this.size[1] + this.size[0]);
          var node = this.nodes[index];
          this.nodes.splice(index, 1);

          for(var otherNode in this.nodes){
            node.disconnect(this.nodes[otherNode]);
          }

          this.size[1]--;
        } else { // add a node
          var random = Math.floor(Math.random() * 3);
          switch(random){
            case(0): // network
              var size = Math.floor(Math.random() * (Mutate.MODIFY_NODES.config.network.size[1] - Mutate.MODIFY_NODES.config.network.size[0]) + Mutate.MODIFY_NODES.config.network.size[0]);
              var hiddenSize =  Math.min(size-2, Math.floor(Math.random() * (Mutate.MODIFY_NODES.config.network.hidden[1] - Mutate.MODIFY_NODES.config.network.hidden[0]) + Mutate.MODIFY_NODES.config.network.hidden[0]));
              var layers = [];

              // x amount of size must be left for remaining layers and output
              var inputLayerSize = Math.floor(Math.random() * (size-(hiddenSize)-1) + 1);
              size -= inputLayerSize;
              layers.push(inputLayerSize);

              for(var i = 0; i < hiddenSize; i++){
                var hiddenLayerSize = Math.floor(Math.random() * (size-(hiddenSize - (i + 1) + 1)-1) + 1);
                size -= hiddenLayerSize;
                layers.push(hiddenLayerSize);
              }

              var outputLayerSize = size;
              layers.push(outputLayerSize);

              var node = Reflect.construct(Architect.Perceptron, layers);
              node.setOptimize(false);
              break;
            case(1): // layer
              var size = Math.floor(Math.random() * (Mutate.MODIFY_NODES.config.layer.size[1] - Mutate.MODIFY_NODES.config.layer.size[0]) + Mutate.MODIFY_NODES.config.layer.size[0]);
              var node = new Layer(size);
              break;
            case(2): // neuron
              var node = new Neuron();
              break;
          }

          // must be inserted after input and before output
          var insert = Math.floor(Math.random() * this.size[1] + this.size[0]);
          this.nodes.splice(insert, 0, node);
          this.size[1]++;

          // now project it to another neurons
          var minBound = Math.max(insert+1, this.size[0]);
          for(var i = 0; i < this.ratio; i++){
            var input = Math.floor(Math.random() * (this.size[0] + this.size[1] + this.size[2] - minBound) + minBound);
            this.nodes[insert].project(this.nodes[input]);
          }

          // now let it have an input connection
          var output = Math.floor(Math.random() * insert);
          this.nodes[output].project(this.nodes[insert]);
        }
        break;
      case(Mutate.MUTATE_NODES):
        // to be developed
        break;
    }
  }
};
