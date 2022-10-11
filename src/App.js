/* src/App.js */
import React, { useEffect, useState, useRef } from 'react'
import { Amplify, API, graphqlOperation } from 'aws-amplify'
import { withAuthenticator, Button, Icon } from '@aws-amplify/ui-react'
import Collapsible from 'react-collapsible'
import '@aws-amplify/ui-react/styles.css'
import { createPlayer, deletePlayer, updatePlayer } from './graphql/mutations'
import { listPlayers } from './graphql/queries'
import { onUpdatePlayer } from './graphql/subscriptions';

import awsExports from "./aws-exports";
Amplify.configure(awsExports);

let playerCount = 0

const initialState = { name: '', score: '' }

function App({ signOut, user }) {
  const [formState, setFormState] = useState(initialState)
  const [players, setPlayers] = useState([])
  const subscriptionRef = useRef()

  useEffect(() => {
    fetchPlayers()

    subscriptionRef.current = API.graphql(
      graphqlOperation(onUpdatePlayer)
    ).subscribe({
      next: (newData) => {
        // New data is received here outside 'App' functional component,
        // how can I render the data then?
        console.log(`new data: ${JSON.stringify(newData)}`);
      }
    });

    return () => {
      //cleanup
      subscriptionRef.current.unsubscribe()
    }
  }, [players])

  function setInput(key, value) {
    setFormState({ ...formState, [key]: value })
  }

  async function fetchPlayers() {
    try {
      const playerData = await API.graphql(graphqlOperation(listPlayers))
      const players = playerData.data.listPlayers.items
      const playersSorted = players.sort((a, b) => (a.number > b.number) ? 1 : -1)
      setPlayers(playersSorted)
    } catch (err) { console.log('error fetching players:', err) }
  }

  async function addPlayer() {
    try {
      playerCount = ++playerCount
      if (!formState.name || !formState.score) return
      const player = { ...formState, number: playerCount }
      setPlayers([...players, player])
      setFormState(initialState)
      await API.graphql(graphqlOperation(createPlayer, {input: player}))
    } catch (err) {
      console.log('error creating player:', err)
    }
  }

  async function deleteAllPlayers() {
    const playerData = await API.graphql(graphqlOperation(listPlayers))
    const allPlayers = playerData.data.listPlayers.items
    try {
      for (const player of allPlayers) {
        const playerId = {
          id: player?.id
        }
        await API.graphql({query: deletePlayer, variables: {input: playerId}});
      await fetchPlayers()
      playerCount = 0
      }
    } catch (err) {
      console.log('error deleting player:', err)
    }
  }

  async function incrementScore(player) {
    try {
      const playerData = {
        number: player.number,
        name: player.name,
        score: ++player.score,
        id: player.id
      }
      await API.graphql({query: updatePlayer, variables: {input: playerData}});
      await fetchPlayers()
    } catch (err) {
      console.log('error updating player score:', err)
    }
  }

  async function decrementScore(player) {
    try {
      const playerData = {
        number: player.number,
        name: player.name,
        score: --player.score,
        id: player.id
      }
      await API.graphql({query: updatePlayer, variables: {input: playerData}});
      await fetchPlayers()
    } catch (err) {
      console.log('error updating player score:', err)
    }
  }

  return (
      <>
        <div id='base' style={styles.container}>
          <Collapsible
              trigger={<HeartIcon/>}
              triggerStyle={{display: 'block',
                textAlign: 'center', padding: '0.5em'}}
              transitionTime={200}
          >
            <div style={{
              border: '1px solid black',
              borderRadius: 5,
              padding: '0.5em',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <input
                  onChange={event => setInput('name', event.target.value)}
                  style={styles.input}
                  value={formState.name}
                  placeholder='Name'
                  className={'column-item'}
              />
              <input
                  onChange={event => setInput('score', event.target.value)}
                  style={styles.input}
                  value={formState.score}
                  placeholder='Score'
                  className={'column-item'}
              />
              <div style={{display: 'flex', justifyContent: 'stretch', alignSelf: 'center'}}>
                <Button style={styles.button} display={'flex'} width={'fit-content'} padding={'0.5em'} onClick={addPlayer}>Create Player</Button>
                <Button style={styles.button} display={'flex'} width={'fit-content'} padding={'0.5em'} onClick={signOut}>Sign out</Button>
                <Button style={styles.button} display={'flex'} width={'fit-content'} padding={'0.5em'} onClick={deleteAllPlayers}>Reset</Button>
              </div>
            </div>
          </Collapsible>
          <div style={{width: '100%', padding: '0.5em'}}>
            {
              players.map((player, index) => (
                  <div key={player.name ? player.name : index} style={styles.player}>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBlock: 0 }}>
                      <span style={{paddingRight: '0.5em'}}>{player.name}:</span>
                      <span>{player.score}</span>
                      <span style={{display: 'flex', float: 'right', justifyContent: 'center'}}>
                  <Button style={styles.increment} onClick={() => incrementScore(player)}>+</Button>
                  <Button style={styles.increment} onClick={() => decrementScore(player)}>-</Button>
                </span>
                    </p>
                  </div>
              ))
            }
          </div>
        </div>
      </>
  )
}

const styles = {
  container: { width: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20 },
  player: {  marginBottom: '0.8rem' },
  input: { border: 'none', backgroundColor: '#ddd', marginBottom: 10, padding: 8, fontSize: 18 },
  playerName: { fontSize: 20, fontWeight: 'bold' },
  playerScore: { marginBottom: 0 },
  button: { backgroundColor: 'black', color: 'white', outline: 'none', fontSize: 18, padding: '12px 0px' },
  increment: { width: '50%', height: '50%', alignSelf: 'center' }
}

const HeartIcon = () => (
    <span>Made with <Icon
        ariaLabel='Favorite'
        viewBox={{width: 24, height: 24}}
        pathData='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0
  3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
    /> by Garrett</span>
);

export default withAuthenticator(App);