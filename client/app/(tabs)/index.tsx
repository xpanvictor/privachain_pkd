import { StyleSheet } from 'react-native';

import WalletScreen from '@/components/screens/WalletScreen';

export default function TabOneScreen() {
  return (
<WalletScreen/>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
